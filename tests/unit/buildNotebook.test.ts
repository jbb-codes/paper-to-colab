import { describe, it, expect } from "vitest";
import {
  buildNotebook,
  extractTitle,
  titleToFilename,
} from "../../lib/buildNotebook";

describe("buildNotebook — source splitting edge cases", () => {
  it("splits multi-line source so each line except last ends with \\n", () => {
    const nb = buildNotebook([{ type: "code", source: "line1\nline2\nline3" }]);
    expect(nb.cells[0].source).toEqual(["line1\n", "line2\n", "line3"]);
  });

  it("handles single-line source (no newlines)", () => {
    const nb = buildNotebook([{ type: "code", source: "x = 1" }]);
    expect(nb.cells[0].source).toEqual(["x = 1"]);
  });

  it("handles empty source string", () => {
    const nb = buildNotebook([{ type: "code", source: "" }]);
    expect(nb.cells[0].source).toEqual([""]);
  });

  it("handles source with trailing newline", () => {
    const nb = buildNotebook([{ type: "code", source: "x = 1\n" }]);
    expect(nb.cells[0].source).toEqual(["x = 1\n", ""]);
  });

  it("joined source reconstructs the original string", () => {
    const original = "import numpy\nx = np.array([1,2,3])\nprint(x)";
    const nb = buildNotebook([{ type: "code", source: original }]);
    expect(nb.cells[0].source.join("")).toBe(original);
  });
});

describe("buildNotebook — notebook structure", () => {
  it("produces valid JSON when stringified", () => {
    const nb = buildNotebook([
      { type: "markdown", source: "# Title" },
      { type: "code", source: "print('hello')" },
    ]);
    const json = JSON.stringify(nb);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("sets _paperTitle to undefined when not provided", () => {
    const nb = buildNotebook([{ type: "markdown", source: "test" }]);
    expect(nb._paperTitle).toBeUndefined();
  });

  it("preserves cell order from input", () => {
    const nb = buildNotebook([
      { type: "markdown", source: "first" },
      { type: "code", source: "second" },
      { type: "markdown", source: "third" },
    ]);
    expect(nb.cells[0].source.join("")).toBe("first");
    expect(nb.cells[1].source.join("")).toBe("second");
    expect(nb.cells[2].source.join("")).toBe("third");
  });
});

describe("extractTitle", () => {
  it("extracts the title from the first H1 in a markdown cell", () => {
    const title = extractTitle([
      { type: "markdown", source: "# My Paper Title\n\nSome intro." },
      { type: "code", source: "print('hello')" },
    ]);
    expect(title).toBe("My Paper Title");
  });

  it("trims whitespace around the extracted title", () => {
    const title = extractTitle([
      { type: "markdown", source: "#   Padded Title   " },
    ]);
    expect(title).toBe("Padded Title");
  });

  it("falls back to the default title when no markdown cell exists", () => {
    const title = extractTitle([{ type: "code", source: "x = 1" }]);
    expect(title).toBe("research-paper-notebook");
  });

  it("falls back to the default title when markdown cell has no H1", () => {
    const title = extractTitle([
      { type: "markdown", source: "## Not an H1\n\nBody text." },
    ]);
    expect(title).toBe("research-paper-notebook");
  });

  it("falls back to the default title for an empty cells array", () => {
    expect(extractTitle([])).toBe("research-paper-notebook");
  });
});

describe("titleToFilename", () => {
  it("converts a normal title to lowercase kebab-case", () => {
    expect(titleToFilename("My Test Paper")).toBe("my-test-paper");
  });

  it("strips special characters", () => {
    expect(titleToFilename("Hello, World! (2024)")).toBe("hello-world-2024");
  });

  it("collapses multiple spaces into a single hyphen", () => {
    expect(titleToFilename("too   many   spaces")).toBe("too-many-spaces");
  });

  it("collapses multiple hyphens into one", () => {
    expect(titleToFilename("dashes---everywhere")).toBe("dashes-everywhere");
  });

  it("trims leading and trailing whitespace", () => {
    expect(titleToFilename("  padded title  ")).toBe("padded-title");
  });

  it("truncates to 80 characters max", () => {
    const longTitle = "a".repeat(100);
    expect(titleToFilename(longTitle).length).toBeLessThanOrEqual(80);
  });

  it("returns 'notebook' for empty string", () => {
    expect(titleToFilename("")).toBe("notebook");
  });

  it("returns 'notebook' for string of only special chars", () => {
    expect(titleToFilename("!@#$%^&*()")).toBe("notebook");
  });

  it("handles unicode characters by stripping them", () => {
    expect(titleToFilename("café résumé")).toBe("caf-rsum");
  });
});
