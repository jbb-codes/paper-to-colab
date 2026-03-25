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
      className={`
        w-full py-3.5 px-6 font-mono text-sm uppercase tracking-widest
        border rounded transition-all duration-200
        ${
          disabled || loading
            ? "border-border text-muted cursor-not-allowed opacity-40"
            : "border-accent text-highlight hover:bg-accent hover:text-background cursor-pointer"
        }
      `}
    >
      {loading ? "Generating..." : "Generate Notebook"}
    </button>
  );
}
