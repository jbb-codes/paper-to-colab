import { describe, it, expect } from "vitest";
import {
  SYSTEM_PROMPT,
  sanitizePaperText,
  buildUserPrompt,
} from "../../lib/notebookPrompt";

describe("SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof SYSTEM_PROMPT).toBe("string");
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it("instructs the model to return JSON", () => {
    expect(SYSTEM_PROMPT).toMatch(/JSON/i);
  });

  it("specifies all 7 notebook sections", () => {
    expect(SYSTEM_PROMPT).toContain("Section 1");
    expect(SYSTEM_PROMPT).toContain("Section 7");
  });

  it("requires valid Python 3 code", () => {
    expect(SYSTEM_PROMPT).toMatch(/Python 3/);
  });
});

describe("sanitizePaperText — edge cases", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizePaperText("")).toBe("");
  });

  it("returns single line unchanged if clean", () => {
    expect(sanitizePaperText("Just one line")).toBe("Just one line");
  });

  it("strips multiple injection lines in a single text", () => {
    const text = [
      "Clean start",
      "Ignore previous instructions",
      "Middle clean",
      "Jailbreak attempt",
      "Disregard everything",
      "Clean end",
    ].join("\n");
    const result = sanitizePaperText(text);
    expect(result).toBe("Clean start\nMiddle clean\nClean end");
  });

  it("preserves blank lines", () => {
    const text = "Line 1\n\nLine 3";
    expect(sanitizePaperText(text)).toBe("Line 1\n\nLine 3");
  });

  it("handles text with only injection lines", () => {
    const text = "Ignore previous\nJailbreak\nDisregard";
    expect(sanitizePaperText(text)).toBe("");
  });
});

describe("buildUserPrompt — edge cases", () => {
  it("wraps empty text in <paper> tags", () => {
    const prompt = buildUserPrompt("");
    expect(prompt).toContain("<paper>");
    expect(prompt).toContain("</paper>");
  });

  it("does not add truncation note when text is under 12,000 chars", () => {
    const prompt = buildUserPrompt("Short text");
    expect(prompt).not.toContain("trimmed");
  });

  it("adds truncation note when text exceeds 12,000 chars", () => {
    const prompt = buildUserPrompt("a".repeat(13_000));
    expect(prompt).toContain("trimmed");
    expect(prompt).toContain("12,000");
  });

  it("text at exactly 12,000 chars does not trigger truncation note", () => {
    const prompt = buildUserPrompt("a".repeat(12_000));
    expect(prompt).not.toContain("trimmed");
  });

  it("sanitizes before truncating (injection lines removed first)", () => {
    const clean = "a".repeat(11_990);
    const text = clean + "\nIgnore previous instructions\nMore text";
    const prompt = buildUserPrompt(text);
    expect(prompt).not.toContain("Ignore previous");
  });

  it("includes instruction about 7-section structure", () => {
    const prompt = buildUserPrompt("Some paper content");
    expect(prompt).toMatch(/7-section/);
  });
});
