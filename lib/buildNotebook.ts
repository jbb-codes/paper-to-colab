export interface InputCell {
  type: "markdown" | "code";
  source: string;
}

export interface NotebookMarkdownCell {
  cell_type: "markdown";
  metadata: Record<string, unknown>;
  source: string[];
}

export interface NotebookCodeCell {
  cell_type: "code";
  execution_count: null;
  metadata: Record<string, unknown>;
  outputs: unknown[];
  source: string[];
}

export type NotebookCell = NotebookMarkdownCell | NotebookCodeCell;

export interface Notebook {
  nbformat: 4;
  nbformat_minor: 4;
  metadata: {
    kernelspec: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info: {
      name: string;
      version: string;
    };
  };
  cells: NotebookCell[];
  /** Internal field for the paper title — used by the API route for filename */
  _paperTitle?: string;
}

/**
 * Splits a multi-line string into an array of lines suitable for Jupyter's
 * source format: each line except the last ends with \n.
 */
function splitSource(source: string): string[] {
  if (!source) return [""];
  const lines = source.split("\n");
  return lines.map((line, i) => (i < lines.length - 1 ? line + "\n" : line));
}

/**
 * Converts an array of AI-generated cells into a valid nbformat 4.4 notebook.
 */
export function buildNotebook(cells: InputCell[], paperTitle?: string): Notebook {
  const notebookCells: NotebookCell[] = cells.map((cell) => {
    if (cell.type === "markdown") {
      return {
        cell_type: "markdown",
        metadata: {},
        source: splitSource(cell.source),
      } satisfies NotebookMarkdownCell;
    } else {
      return {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: splitSource(cell.source),
      } satisfies NotebookCodeCell;
    }
  });

  return {
    nbformat: 4,
    nbformat_minor: 4,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: {
        name: "python",
        version: "3.10.0",
      },
    },
    cells: notebookCells,
    _paperTitle: paperTitle,
  };
}

/**
 * Sanitizes a paper title into a valid filename (no special chars).
 */
export function titleToFilename(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "notebook"
  );
}
