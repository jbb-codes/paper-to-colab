import { describe, it, expect } from "vitest";
import { buildNotebook } from "../../lib/buildNotebook";

describe("Task 7 — .ipynb file builder", () => {
  const sampleCells = [
    { type: "markdown" as const, source: "# Hello World\nThis is a test." },
    {
      type: "code" as const,
      source: "import numpy as np\nprint('hello')",
    },
    { type: "markdown" as const, source: "## Section 2" },
    { type: "code" as const, source: "x = 1 + 1\nprint(x)" },
  ];

  it("returns an object with nbformat 4", () => {
    const nb = buildNotebook(sampleCells);
    expect(nb.nbformat).toBe(4);
  });

  it("returns nbformat_minor of 4", () => {
    const nb = buildNotebook(sampleCells);
    expect(nb.nbformat_minor).toBe(4);
  });

  it("includes Python 3 kernel metadata", () => {
    const nb = buildNotebook(sampleCells);
    expect(nb.metadata.kernelspec.name).toBe("python3");
    expect(nb.metadata.kernelspec.display_name).toContain("Python 3");
    expect(nb.metadata.language_info.name).toBe("python");
  });

  it("converts cells array correctly", () => {
    const nb = buildNotebook(sampleCells);
    expect(nb.cells).toHaveLength(4);
  });

  it("converts markdown cells with correct cell_type", () => {
    const nb = buildNotebook(sampleCells);
    expect(nb.cells[0].cell_type).toBe("markdown");
    expect(nb.cells[2].cell_type).toBe("markdown");
  });

  it("converts code cells with correct cell_type", () => {
    const nb = buildNotebook(sampleCells);
    expect(nb.cells[1].cell_type).toBe("code");
    expect(nb.cells[3].cell_type).toBe("code");
  });

  it("splits source string into lines array", () => {
    const nb = buildNotebook(sampleCells);
    // source should be an array of lines (each ending in \n except last)
    expect(Array.isArray(nb.cells[0].source)).toBe(true);
  });

  it("code cells include execution_count as null", () => {
    const nb = buildNotebook(sampleCells);
    expect(nb.cells[1].execution_count).toBeNull();
    expect(nb.cells[3].execution_count).toBeNull();
  });

  it("code cells include empty outputs array", () => {
    const nb = buildNotebook(sampleCells);
    expect(Array.isArray(nb.cells[1].outputs)).toBe(true);
    expect(nb.cells[1].outputs).toHaveLength(0);
  });

  it("markdown cells do not have execution_count", () => {
    const nb = buildNotebook(sampleCells);
    expect(nb.cells[0].execution_count).toBeUndefined();
  });

  it("handles empty cells array", () => {
    const nb = buildNotebook([]);
    expect(nb.cells).toHaveLength(0);
    expect(nb.nbformat).toBe(4);
  });

  it("preserves source content correctly", () => {
    const nb = buildNotebook(sampleCells);
    const joined = (nb.cells[0].source as string[]).join("");
    expect(joined).toBe("# Hello World\nThis is a test.");
  });

  it("extracts paper title from first markdown cell for filename", () => {
    const nb = buildNotebook(sampleCells, "My Test Paper");
    expect(nb._paperTitle).toBe("My Test Paper");
  });
});
