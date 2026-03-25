"use client";

interface ErrorViewProps {
  message: string;
  onReset: () => void;
}

export default function ErrorView({ message, onReset }: ErrorViewProps) {
  return (
    <div
      data-testid="error-view"
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 animate-fade-in"
    >
      <div className="w-full max-w-xl text-center">
        {/* Error indicator */}
        <div className="inline-flex items-center justify-center w-12 h-12 border border-red-800 rounded-full mb-6">
          <span className="text-red-400 text-lg font-mono">✕</span>
        </div>

        <h2 className="text-xl font-semibold text-highlight mb-4">
          Generation Failed
        </h2>

        <div
          data-testid="error-message"
          className="bg-surface/40 border border-border rounded p-4 mb-8 text-left"
        >
          <p className="text-sm font-mono text-red-400 leading-relaxed">
            {message}
          </p>
        </div>

        <button
          data-testid="error-reset-button"
          type="button"
          onClick={onReset}
          className="font-mono text-sm uppercase tracking-widest border border-border text-muted hover:border-accent hover:text-highlight transition-all duration-200 px-6 py-3 rounded cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
