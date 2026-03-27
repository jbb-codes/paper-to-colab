import { describe, it, expect } from "vitest";
import { scanForDangerousPatterns } from "../../lib/validateCells";

describe("scanForDangerousPatterns — edge cases", () => {
  it("returns null for empty cells array", () => {
    expect(scanForDangerousPatterns([])).toBeNull();
  });

  it("returns null for array of only markdown cells", () => {
    const cells = [
      { type: "markdown" as const, source: "# Title with os.system mention" },
      { type: "markdown" as const, source: "We discuss subprocess and eval(" },
    ];
    expect(scanForDangerousPatterns(cells)).toBeNull();
  });

  it("returns the first match when multiple dangerous patterns exist", () => {
    const cells = [
      { type: "code" as const, source: "os.system('ls')\nsubprocess.run(['ls'])" },
    ];
    const match = scanForDangerousPatterns(cells);
    expect(match?.pattern).toBe("os.system");
  });

  it("returns the earliest cell index with a match", () => {
    const cells = [
      { type: "code" as const, source: "safe code" },
      { type: "code" as const, source: "safe code" },
      { type: "code" as const, source: "eval('bad')" },
    ];
    expect(scanForDangerousPatterns(cells)?.cellIndex).toBe(2);
  });

  it("handles code cell with empty source", () => {
    const cells = [{ type: "code" as const, source: "" }];
    expect(scanForDangerousPatterns(cells)).toBeNull();
  });

  it("detects pattern in multi-line source", () => {
    const cells = [
      {
        type: "code" as const,
        source: "import os\nresult = os.system('whoami')\nprint(result)",
      },
    ];
    expect(scanForDangerousPatterns(cells)?.pattern).toBe("os.system");
  });

  it("does not flag 'evaluate' or 'execution' (no false positive on substrings)", () => {
    const cells = [
      { type: "code" as const, source: "# We evaluate the model\nresult = model.evaluate(data)" },
    ];
    // "eval(" is the pattern, not "eval" — so "evaluate" should be safe
    expect(scanForDangerousPatterns(cells)).toBeNull();
  });

  it("flags 'exec(' even when embedded in a longer expression", () => {
    const cells = [
      { type: "code" as const, source: "exec(compile(code, '<string>', 'exec'))" },
    ];
    expect(scanForDangerousPatterns(cells)?.pattern).toBe("exec(");
  });
});
