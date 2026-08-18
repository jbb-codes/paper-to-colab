import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../");

describe("Task 8 — Anonymous GitHub Gist upload", () => {
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

  it("lib/uploadGist.ts exists", () => {
    expect(existsSync(resolve(root, "lib/uploadGist.ts"))).toBe(true);
  });

  it("uploadGist module exports an uploadGist function", async () => {
    const mod = await import("../../lib/uploadGist");
    expect(typeof mod.uploadGist).toBe("function");
  });

  it("uploadGist returns colabUrl on success", async () => {
    // Mock fetch to simulate GitHub Gist API response
    const mockGistId = "abc123def456";
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: mockGistId,
        html_url: `https://gist.github.com/${mockGistId}`,
      }),
    }) as unknown as typeof fetch;

    const { uploadGist } = await import("../../lib/uploadGist");
    const result = await uploadGist(
      '{"nbformat": 4, "cells": []}',
      "test-notebook.ipynb",
    );

    expect(result.gistId).toBe(mockGistId);
    expect(result.colabUrl).toBe(
      `https://colab.research.google.com/gist/anonymous/${mockGistId}`,
    );
  });

  it("uploadGist posts to the correct GitHub Gist API endpoint", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "abcdef789012",
        html_url: "https://gist.github.com/abcdef789012",
      }),
    }) as unknown as typeof fetch;

    global.fetch = mockFetch;

    const { uploadGist } = await import("../../lib/uploadGist");
    await uploadGist('{"nbformat": 4}', "my-notebook.ipynb");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/gists",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("uploadGist sends correct content-type header", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "abcdef789012",
        html_url: "https://gist.github.com/abcdef789012",
      }),
    }) as unknown as typeof fetch;

    global.fetch = mockFetch;
    const { uploadGist } = await import("../../lib/uploadGist");
    await uploadGist('{"nbformat": 4}', "my-notebook.ipynb");

    const callArgs = mockFetch.mock.calls[0];
    const options = callArgs[1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("uploadGist throws on API error", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ message: "Validation Failed" }),
    }) as unknown as typeof fetch;

    const { uploadGist } = await import("../../lib/uploadGist");
    await expect(uploadGist('{"nbformat": 4}', "test.ipynb")).rejects.toThrow();
  });

  it("colabUrl follows the correct format", async () => {
    const gistId = "abc123def456789a";
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: gistId,
        html_url: `https://gist.github.com/${gistId}`,
      }),
    }) as unknown as typeof fetch;

    const { uploadGist } = await import("../../lib/uploadGist");
    const { colabUrl } = await uploadGist('{"nbformat": 4}', "notebook.ipynb");

    expect(colabUrl).toMatch(
      /^https:\/\/colab\.research\.google\.com\/gist\/anonymous\//,
    );
    expect(colabUrl).toContain(gistId);
  });
});
