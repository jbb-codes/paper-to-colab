export interface NotebookCell {
  type: "markdown" | "code";
  source: string;
}

/**
 * Parses the raw LLM text response into validated notebook cells.
 * Strips markdown code fences the model may have added, then filters
 * out any entries that don't match the expected cell shape.
 * Throws if the response isn't valid JSON, isn't an array, or yields
 * no valid cells.
 */
export function parseNotebookResponse(rawContent: string): NotebookCell[] {
  const cleaned = rawContent
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed: unknown = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error("Response is not an array");
  }

  const cells = parsed.filter(
    (cell): cell is NotebookCell =>
      typeof cell === "object" &&
      cell !== null &&
      (cell.type === "markdown" || cell.type === "code") &&
      typeof cell.source === "string",
  );

  if (cells.length === 0) {
    throw new Error("No valid cells found in response");
  }

  return cells;
}
