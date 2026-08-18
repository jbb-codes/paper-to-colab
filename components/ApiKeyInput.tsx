"use client";

import { useState } from "react";

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ApiKeyInput({ value, onChange }: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="w-full">
      <label
        htmlFor="api-key-input"
        className="block text-sm font-mono text-muted mb-2 uppercase tracking-widest"
      >
        Anthropic API Key
      </label>
      <div className="relative">
        <input
          id="api-key-input"
          data-testid="api-key-input"
          type={showKey ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="sk-ant-..."
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-surface border border-border rounded px-4 py-3 font-mono text-sm text-highlight placeholder-muted focus:outline-none transition-colors pr-12"
          style={{ outline: "none" }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--primary)")
          }
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        <button
          type="button"
          data-testid="api-key-toggle"
          onClick={() => setShowKey((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-highlight transition-colors text-xs font-mono uppercase tracking-widest"
          tabIndex={-1}
          aria-label={showKey ? "Hide API key" : "Show API key"}
        >
          {showKey ? "hide" : "show"}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-muted font-mono">
        Your key is never stored or logged — used only for this request.
      </p>
    </div>
  );
}
