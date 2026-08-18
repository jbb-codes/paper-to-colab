import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Task 4 — gistId hex validation in uploadGist", () => {
  const ORIGINAL_ENV = process.env.GITHUB_TOKEN;

  beforeEach(() => {
    process.env.GITHUB_TOKEN = "ghp_testtoken123";
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = ORIGINAL_ENV;
    }
  });

  it("uploadGist throws when gistId contains non-hex characters", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "not-a-hex-id/../../evil",
        html_url: "https://gist.github.com/x",
      }),
    }) as unknown as typeof fetch;

    const { uploadGist } = await import("../../lib/uploadGist");
    await expect(uploadGist('{"nbformat":4}', "nb.ipynb")).rejects.toThrow(
      /invalid gist id/i,
    );
  });

  it("uploadGist succeeds when gistId is valid hex", async () => {
    const validId = "abc123def456789";
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: validId,
        html_url: `https://gist.github.com/${validId}`,
      }),
    }) as unknown as typeof fetch;

    const { uploadGist } = await import("../../lib/uploadGist");
    const result = await uploadGist('{"nbformat":4}', "nb.ipynb");
    expect(result.colabUrl).toContain(validId);
  });

  it("lib/uploadGist.ts contains the hex validation regex", () => {
    const { readFileSync } = require("fs");
    const { resolve } = require("path");
    const content = readFileSync(
      resolve(__dirname, "../../lib/uploadGist.ts"),
      "utf8",
    );
    expect(content).toContain("/^[a-f0-9]+$/i");
  });
});
