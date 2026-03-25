"use client";

import { useEffect, useState } from "react";
import { STATUS_MESSAGES } from "@/lib/statusMessages";

interface ProcessingViewProps {
  currentStep?: number;
}

export default function ProcessingView({ currentStep = 0 }: ProcessingViewProps) {
  const [visibleIndex, setVisibleIndex] = useState(currentStep);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (currentStep !== visibleIndex) {
      // Fade out, then switch message, then fade in
      setFade(false);
      const timer = setTimeout(() => {
        setVisibleIndex(currentStep);
        setFade(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, visibleIndex]);

  const progress = Math.round(((visibleIndex + 1) / STATUS_MESSAGES.length) * 100);

  return (
    <div
      data-testid="processing-view"
      className="min-h-screen flex flex-col items-center justify-center px-4 pt-28 pb-16 animate-fade-in"
    >
      <div className="w-full max-w-xl text-center">
        {/* Spinner */}
        <div className="flex justify-center mb-10" data-testid="processing-spinner">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-border" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
          </div>
        </div>

        {/* Status message */}
        <div
          data-testid="processing-message"
          className={`font-mono text-sm text-accent mb-8 min-h-[1.5rem] transition-opacity duration-300 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          {STATUS_MESSAGES[visibleIndex]}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-surface rounded-full h-0.5 mb-3 overflow-hidden">
          <div
            data-testid="processing-progress"
            className="h-full bg-accent transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step count */}
        <div className="font-mono text-xs text-muted">
          Step {visibleIndex + 1} of {STATUS_MESSAGES.length}
        </div>
      </div>
    </div>
  );
}
