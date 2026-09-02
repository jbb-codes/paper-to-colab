import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pdf-parse before importing the route
vi.mock("pdf-parse", () => ({
  default: vi.fn(),
}));

import { POST } from "../../app/api/extract/route";
import { NextRequest } from "next/server";
import pdfParse from "pdf-parse";

const mockedPdfParse = vi.mocked(pdfParse);

/**
 * Build a NextRequest with FormData body.
 * Do NOT set content-type manually — let the runtime add it with the
 * correct multipart boundary so that req.formData() can parse it.
 */
function buildRequest(file: File | null): NextRequest {
  const formData = new FormData();
  if (file) formData.append("file", file);

  return new NextRequest("http://localhost:3000/api/extract", {
    method: "POST",
    body: formData,
  });
}

function pdfFile(
  content: Uint8Array,
  name = "paper.pdf",
  type = "application/pdf",
) {
  return new File([content as BlobPart], name, { type });
}

describe("/api/extract — integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when content-type is not multipart/form-data", async () => {
    const req = new NextRequest("http://localhost:3000/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/multipart/i);
  });

  it("returns 400 when no file is attached", async () => {
    const req = buildRequest(null);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no file/i);
  });

  it("returns 400 when file is empty (0 bytes)", async () => {
    const emptyFile = pdfFile(new Uint8Array(0));
    const req = buildRequest(emptyFile);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/empty/i);
  });

  it("returns 413 when file exceeds 20MB", async () => {
    // Create a file that reports > 20MB size
    const bigContent = new Uint8Array(21 * 1024 * 1024);
    const bigFile = pdfFile(bigContent);
    const req = buildRequest(bigFile);
    const res = await POST(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toMatch(/too large/i);
  });

  it("returns 415 when file is not a PDF", async () => {
    const txtFile = new File([new Uint8Array([65, 66, 67])], "notes.txt", {
      type: "text/plain",
    });
    const req = buildRequest(txtFile);
    const res = await POST(req);
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toMatch(/PDF/i);
  });

  it("returns 200 with text and pageCount on success", async () => {
    mockedPdfParse.mockResolvedValueOnce({
      text: "Extracted paper content here",
      numpages: 5,
      numrender: 5,
      info: {},
      metadata: null,
      version: "default",
    });

    const fakePdf = pdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46])); // %PDF
    const req = buildRequest(fakePdf);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe("Extracted paper content here");
    expect(body.pageCount).toBe(5);
  });

  it("returns 500 with generic error when pdf-parse throws", async () => {
    mockedPdfParse.mockRejectedValueOnce(
      new Error("Corrupted PDF structure at byte 0x4F"),
    );

    const fakePdf = pdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const req = buildRequest(fakePdf);
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("PDF parsing failed.");
    // Internal error must NOT leak to client
    expect(JSON.stringify(body)).not.toContain("Corrupted");
  });

  it("accepts .pdf extension even with non-standard MIME type", async () => {
    mockedPdfParse.mockResolvedValueOnce({
      text: "Content",
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: "default",
    });

    const file = new File([new Uint8Array([0x25, 0x50])], "paper.pdf", {
      type: "application/octet-stream",
    });
    const req = buildRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
