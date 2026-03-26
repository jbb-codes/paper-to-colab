import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { SYSTEM_PROMPT, buildUserPrompt } from "../../lib/notebookPrompt";

const root = resolve(__dirname, "../../");

describe("Task 6 – Notebook generation API route and prompt", () => {
  it("lib/notebookPrompt.ts exists", () => {
    expect(existsSync(resolve(root, "lib/notebookPrompt.ts"))).toBe(true);
  });

  it("app/api/generate/route.ts exists", () => {
    expect(existsSync(resolve(root, "app/api/generate/route.ts"))).toBe(true);
  });

  it("SYSTEM_PROMPT mentions all 7 sections", () => {
    expect(SYSTEM_PROMPT).toContain("Header");
    expect(SYSTEM_PROMPT).toContain("Background");
    expect(SYSTEM_PROMPT).toContain("Algorithm Walkthrough");
    expect(SYSTEM_PROMPT).toContain("Synthetic Data Generation");
    expect(SYSTEM_PROMPT).toContain("Full Implementation");
    expect(SYSTEM_PROMPT).toContain("Experiments");
    expect(SYSTEM_PROMPT).toContain("Extensions");
  });

  it("SYSTEM_PROMPT enforces JSON array return format", () => {
    expect(SYSTEM_PROMPT).toContain("JSON array");
    expect(SYSTEM_PROMPT).toContain('"type"');
    expect(SYSTEM_PROMPT).toContain('"source"');
  });

  it("SYSTEM_PROMPT mentions markdown and code cell types", () => {
    expect(SYSTEM_PROMPT).toContain("markdown");
    expect(SYSTEM_PROMPT).toContain("code");
  });

  it("SYSTEM_PROMPT mentions Groq model or llama or synthetic data", () => {
    expect(SYSTEM_PROMPT).toContain("synthetic data");
  });

  it("buildUserPrompt wraps the paper text correctly", () => {
    const prompt = buildUserPrompt("This is a test paper.");
    expect(prompt).toContain("This is a test paper.");
    expect(prompt).toContain("<paper>");
  });

  it("buildUserPrompt truncates paper text at 12,000 chars", () => {
    const longText = "a".repeat(20_000);
    const prompt = buildUserPrompt(longText);
    expect(prompt).toContain("12,000");
    // The truncated text should be ~100k chars plus prompt overhead
    expect(prompt.length).toBeLessThan(15_000);
  });

  it("generate route exports a POST handler", () => {
    const content = readFileSync(
      resolve(root, "app/api/generate/route.ts"),
      "utf8"
    );
    expect(content).toContain("export async function POST");
  });

  it("generate route uses groq-sdk", () => {
    const content = readFileSync(
      resolve(root, "app/api/generate/route.ts"),
      "utf8"
    );
    expect(content).toContain("groq");
  });

  it("generate route uses llama-3.3-70b-versatile model", () => {
    const content = readFileSync(
      resolve(root, "app/api/generate/route.ts"),
      "utf8"
    );
    expect(content).toContain("llama-3.3-70b-versatile");
  });

  it("generate route accepts paperText and apiKey", () => {
    const content = readFileSync(
      resolve(root, "app/api/generate/route.ts"),
      "utf8"
    );
    expect(content).toContain("paperText");
    expect(content).toContain("apiKey");
  });
});
