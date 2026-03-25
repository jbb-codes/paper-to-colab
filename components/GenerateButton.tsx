"use client";

interface GenerateButtonProps {
  disabled: boolean;
  onClick: () => void;
  loading?: boolean;
}

export default function GenerateButton({
  disabled,
  onClick,
  loading = false,
}: GenerateButtonProps) {
  return (
    <button
      data-testid="generate-button"
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-3.5 px-6 font-mono text-sm tracking-wide rounded transition-all duration-200 flex items-center justify-center gap-2"
      style={
        disabled || loading
          ? {
              backgroundColor: "var(--surface)",
              color: "var(--muted)",
              border: "1px solid var(--border)",
              cursor: "not-allowed",
              opacity: 0.5,
            }
          : {
              backgroundColor: "var(--primary)",
              color: "var(--primary-fg)",
              border: "1px solid transparent",
              cursor: "pointer",
            }
      }
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "var(--primary-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "var(--primary)";
        }
      }}
    >
      {loading ? (
        "Generating..."
      ) : (
        <>
          Generate Notebook
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </>
      )}
    </button>
  );
}
