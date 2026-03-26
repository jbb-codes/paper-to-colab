import type { InputCell } from "./buildNotebook";

// Patterns that should never appear in LLM-generated educational notebooks.
// Their presence in a generated code cell indicates likely prompt injection.
const DANGEROUS_PATTERNS = [
  "os.system",
  "subprocess",
  "eval(",
  "exec(",
  "__import__",
  "socket.",
  "urllib.request",
] as const;

export interface DangerousPatternMatch {
  pattern: string;
  cellIndex: number;
}

/**
 * Scans generated code cells for dangerous Python patterns that should never
 * appear in a legitimate educational notebook. Returns the first match found,
 * or null if the cells are clean.
 *
 * Markdown cells are intentionally skipped — they may legitimately mention
 * these concepts in explanatory prose.
 */
export function scanForDangerousPatterns(
  cells: InputCell[]
): DangerousPatternMatch | null {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.type !== "code") continue;

    for (const pattern of DANGEROUS_PATTERNS) {
      if (cell.source.includes(pattern)) {
        return { pattern, cellIndex: i };
      }
    }
  }
  return null;
}
