import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock groq-sdk before importing the route
const mockCreate = vi.fn();
vi.mock("groq-sdk", () => {
  class APIError extends Error {
    status: number;
    constructor(status: number, _body: unknown, message: string) {
      super(message);
      this.status = status;
      this.name = "APIError";
    }
  }

  class Groq {
    chat = { completions: { create: mockCreate } };
    constructor() {}
    static APIError = APIError;
  }
  return { default: Groq };
});

// Mock uploadGist — use the path the route uses (resolved via @/ alias)
vi.mock("@/lib/uploadGist", () => ({
  uploadGist: vi.fn(),
}));

import { POST } from "../../app/api/generate/route";
import { NextRequest } from "next/server";
import { uploadGist } from "@/lib/uploadGist";

const mockedUploadGist = vi.mocked(uploadGist);

const VALID_CELLS = JSON.stringify([
  { type: "markdown", source: "# Attention Is All You Need\nA tutorial." },
  { type: "code", source: "import numpy as np" },
  { type: "markdown", source: "## Background" },
  { type: "code", source: "x = np.array([1,2,3])\nprint(x)" },
]);

function buildRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/generate — integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUploadGist.mockResolvedValue({
      gistId: "abc123def456",
      gistUrl: "https://gist.github.com/abc123def456",
      colabUrl: "https://colab.research.google.com/gist/anonymous/abc123def456",
    });
  });

  it("returns 400 when apiKey is missing", async () => {
    const req = buildRequest({ paperText: "some text" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/API key/i);
  });

  it("returns 400 when apiKey is empty string", async () => {
    const req = buildRequest({ paperText: "some text", apiKey: "  " });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when paperText is missing", async () => {
    const req = buildRequest({ apiKey: "gsk_test123" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/paper text/i);
  });

  it("returns 400 when paperText is empty string", async () => {
    const req = buildRequest({ apiKey: "gsk_test123", paperText: "   " });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 with notebook on successful generation", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: VALID_CELLS } }],
    });

    const req = buildRequest({ apiKey: "gsk_test123", paperText: "Paper about attention." });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notebookJson).toBeDefined();
    expect(body.filename).toMatch(/\.ipynb$/);
    expect(body.colabUrl).toContain("colab.research.google.com");
    expect(body.cells).toHaveLength(4);
    expect(body.title).toContain("Attention Is All You Need");
  });

  it("returns 422 when LLM returns unparseable content", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "This is not valid JSON at all" } }],
    });

    const req = buildRequest({ apiKey: "gsk_test123", paperText: "Paper text" });
    const res = await POST(req);

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/parse/i);
    // Must NOT leak raw LLM content
    expect(JSON.stringify(body)).not.toContain("This is not valid JSON");
  });

  it("returns 422 when LLM returns cells with dangerous patterns", async () => {
    const dangerousCells = JSON.stringify([
      { type: "markdown", source: "# Title" },
      { type: "code", source: "import os\nos.system('rm -rf /')" },
    ]);
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: dangerousCells } }],
    });

    const req = buildRequest({ apiKey: "gsk_test123", paperText: "Paper text" });
    const res = await POST(req);

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/adversarial/i);
  });

  it("still returns notebook when gist upload fails", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: VALID_CELLS } }],
    });
    mockedUploadGist.mockRejectedValueOnce(new Error("GitHub API rate limited"));

    const req = buildRequest({ apiKey: "gsk_test123", paperText: "Paper text" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notebookJson).toBeDefined();
    expect(body.colabUrl).toBeNull();
    expect(body.gistError).toMatch(/rate limited/i);
  });

  it("strips markdown code fences from LLM response", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "```json\n" + VALID_CELLS + "\n```" } }],
    });

    const req = buildRequest({ apiKey: "gsk_test123", paperText: "Paper text" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cells).toHaveLength(4);
  });

  it("filters out invalid cells from LLM response", async () => {
    const mixedCells = JSON.stringify([
      { type: "markdown", source: "# Title" },
      { type: "invalid", source: "bad" },
      { type: "code" },
      { type: "code", source: "x = 1" },
    ]);
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: mixedCells } }],
    });

    const req = buildRequest({ apiKey: "gsk_test123", paperText: "Paper text" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cells).toHaveLength(2);
  });

  it("returns 422 when all cells are invalid (filtered to empty)", async () => {
    const badCells = JSON.stringify([
      { type: "invalid", source: "bad" },
      { nope: true },
    ]);
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: badCells } }],
    });

    const req = buildRequest({ apiKey: "gsk_test123", paperText: "Paper text" });
    const res = await POST(req);

    expect(res.status).toBe(422);
  });

  it("returns generic 500 on unexpected errors", async () => {
    mockCreate.mockRejectedValueOnce(new TypeError("Cannot read properties of undefined"));

    const req = buildRequest({ apiKey: "gsk_test123", paperText: "Paper text" });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Generation failed. Please try again.");
    expect(JSON.stringify(body)).not.toContain("Cannot read properties");
  });

  it("returns default title when no H1 found in markdown cells", async () => {
    const noTitleCells = JSON.stringify([
      { type: "code", source: "x = 1" },
      { type: "markdown", source: "No heading here, just text." },
    ]);
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: noTitleCells } }],
    });

    const req = buildRequest({ apiKey: "gsk_test123", paperText: "Paper text" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("research-paper-notebook");
  });
});
