"use client";

interface ResultViewProps {
  notebookJson: string;
  filename: string;
  colabUrl?: string;
  onReset: () => void;
}

export default function ResultView({
  notebookJson,
  filename,
  colabUrl,
  onReset,
}: ResultViewProps) {
  const handleDownload = () => {
    const blob = new Blob([notebookJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const displayName = filename.replace(".ipynb", "");

  return (
    <div
      data-testid="result-view"
      className="min-h-screen flex flex-col items-center justify-center px-4 pt-28 pb-16 animate-fade-in"
    >
      <div className="w-full max-w-xl">
        {/* Success indicator */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 border border-accent/40 rounded-full mb-6">
            <span className="text-accent text-lg font-mono">✓</span>
          </div>
          <h2 className="text-xl font-semibold text-highlight mb-2">
            Notebook Generated
          </h2>
          <p className="text-muted text-sm font-mono">{displayName}</p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3 mb-8">
          <button
            data-testid="download-button"
            type="button"
            onClick={handleDownload}
            className="w-full py-3.5 px-6 font-mono text-sm uppercase tracking-widest border border-accent text-highlight hover:bg-accent hover:text-background transition-all duration-200 rounded cursor-pointer"
          >
            Download .ipynb
          </button>

          {colabUrl && (
            <a
              data-testid="colab-button"
              href={colabUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 px-6 font-mono text-sm uppercase tracking-widest border border-border text-muted hover:border-accent hover:text-highlight transition-all duration-200 rounded text-center"
            >
              Open in Google Colab ↗
            </a>
          )}
        </div>

        {/* Notebook preview — cell count */}
        <div className="border border-border rounded p-4 mb-8 bg-surface/20">
          <p className="text-xs font-mono text-muted text-center">
            {(() => {
              try {
                const nb = JSON.parse(notebookJson);
                const cells = nb.cells ?? [];
                const codeCells = cells.filter(
                  (c: { cell_type: string }) => c.cell_type === "code"
                ).length;
                const mdCells = cells.filter(
                  (c: { cell_type: string }) => c.cell_type === "markdown"
                ).length;
                return `${cells.length} cells — ${codeCells} code · ${mdCells} markdown`;
              } catch {
                return "Notebook ready";
              }
            })()}
          </p>
        </div>

        {/* Reset */}
        <div className="text-center">
          <button
            data-testid="reset-button"
            type="button"
            onClick={onReset}
            className="text-xs font-mono text-muted hover:text-highlight transition-colors uppercase tracking-widest"
          >
            ← Generate another
          </button>
        </div>
      </div>
    </div>
  );
}
