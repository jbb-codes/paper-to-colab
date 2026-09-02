"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function LogoMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Document */}
      <rect
        x="1"
        y="1"
        width="12"
        height="16"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <line
        x1="4"
        y1="6"
        x2="10"
        y2="6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="9"
        x2="10"
        y2="9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="12"
        x2="8"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Arrow */}
      <path
        d="M14.5 9L18 11L14.5 13"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="15"
        y1="11"
        x2="21"
        y2="11"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ThemeToggleIcon({ theme }: { theme: Theme }) {
  if (theme === "dark") {
    return (
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
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
      </svg>
    );
  }
  return (
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Header() {
  const [theme, setTheme] = useState<Theme>("dark");

  // Reading localStorage/matchMedia during the lazy useState initializer
  // would make the client's first render diverge from the server's "dark"
  // default and trigger a hydration mismatch — deferring to an effect
  // applies the real theme only after hydration completes.
  useEffect(() => {
    const initial = getInitialTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 text-highlight">
        <LogoMark />
        <span className="font-mono text-base font-semibold tracking-tight">
          paper<span style={{ color: "var(--primary)" }}>→</span>colab
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <span
          className="hidden sm:block font-mono text-xs tracking-widest uppercase px-2 py-1 rounded border border-border"
          style={{ color: "var(--accent)", borderColor: "var(--border)" }}
        >
          v1.0
        </span>
        <button
          type="button"
          onClick={toggle}
          data-testid="theme-toggle"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="w-8 h-8 flex items-center justify-center rounded border border-border hover:border-accent transition-colors"
          style={{ color: "var(--accent)" }}
        >
          <ThemeToggleIcon theme={theme} />
        </button>
      </div>
    </header>
  );
}
