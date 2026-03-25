"use client";

import { useState, useCallback } from "react";
import ApiKeyInput from "@/components/ApiKeyInput";
import PdfDropzone from "@/components/PdfDropzone";
import GenerateButton from "@/components/GenerateButton";
import ProcessingView from "@/components/ProcessingView";
import ResultView from "@/components/ResultView";
import ErrorView from "@/components/ErrorView";

type AppState = "form" | "processing" | "result" | "error";

interface ResultData {
  notebookJson: string;
  filename: string;
  colabUrl?: string | null;
}

const STEP_INTERVAL = 3500;

const FEATURES = [
  { label: "7-section structure" },
  { label: "Realistic synthetic data" },
  { label: "Runs in Google Colab" },
  { label: "Groq-powered" },
];

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [appState, setAppState] = useState<AppState>("form");
  const [processingStep, setProcessingStep] = useState(0);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const canGenerate = apiKey.trim().length > 0 && pdfFile !== null;

  const advanceStep = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<number>>,
      maxSteps: number
    ) => {
      const ids: ReturnType<typeof setTimeout>[] = [];
      for (let i = 1; i < maxSteps; i++) {
        ids.push(setTimeout(() => setter(i), i * STEP_INTERVAL));
      }
      return () => ids.forEach(clearTimeout);
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (!pdfFile || !apiKey.trim()) return;

    setAppState("processing");
    setProcessingStep(0);
    setErrorMessage("");

    const cleanup = advanceStep(setProcessingStep, 7);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      const extractRes = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok)
        throw new Error(extractData.error ?? "Failed to extract PDF text");

      const { text: paperText } = extractData as {
        text: string;
        pageCount: number;
      };

      setProcessingStep(1);

      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperText, apiKey: apiKey.trim() }),
      });
      const generateData = await generateRes.json();
      if (!generateRes.ok)
        throw new Error(generateData.error ?? "Failed to generate notebook");

      const { notebookJson, filename, colabUrl } = generateData as {
        notebookJson: string;
        filename: string;
        colabUrl?: string | null;
        gistError?: string;
      };

      setProcessingStep(6);
      cleanup();
      await new Promise((r) => setTimeout(r, 800));

      setResultData({ notebookJson, filename, colabUrl });
      setAppState("result");
    } catch (err: unknown) {
      cleanup();
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setAppState("error");
    }
  }, [apiKey, pdfFile, advanceStep]);

  const handleReset = useCallback(() => {
    setAppState("form");
    setProcessingStep(0);
    setResultData(null);
    setErrorMessage("");
  }, []);

  if (appState === "processing") return <ProcessingView currentStep={processingStep} />;
  if (appState === "result" && resultData)
    return (
      <ResultView
        notebookJson={resultData.notebookJson}
        filename={resultData.filename}
        colabUrl={resultData.colabUrl ?? undefined}
        onReset={handleReset}
      />
    );
  if (appState === "error") return <ErrorView message={errorMessage} onReset={handleReset} />;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6 dot-grid overflow-hidden">
        {/* Radial vignette over the dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, var(--background) 100%)",
          }}
        />

        <div className="relative max-w-2xl mx-auto text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 border border-border rounded-full px-3 py-1 mb-8">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "var(--primary)" }}
            />
            <span className="font-mono text-xs text-muted uppercase tracking-widest">
              Research acceleration tool
            </span>
          </div>

          {/* Headline */}
          <h1
            data-testid="headline"
            className="text-5xl sm:text-6xl font-semibold leading-[1.08] tracking-tight text-highlight mb-6"
          >
            Turn any paper into a{" "}
            <span
              className="font-mono"
              style={{ color: "var(--primary)" }}
            >
              Colab
            </span>{" "}
            notebook.
          </h1>

          {/* Subheading */}
          <p
            data-testid="subheading"
            className="text-muted text-base leading-relaxed max-w-lg mx-auto mb-10"
          >
            Upload a research PDF. Get a fully-implemented, tutorial-grade
            Google Colab notebook — with synthetic data, visualizations, and
            a step-by-step narrative. Built for researchers who move fast.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {FEATURES.map((f) => (
              <span
                key={f.label}
                className="font-mono text-xs text-muted border border-border rounded px-3 py-1.5 bg-surface"
              >
                {f.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────────── */}
      <hr className="rule-fade mx-6" />

      {/* ── Form ────────────────────────────────────────── */}
      <section className="flex-1 flex items-start justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          {/* Step label */}
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
            Get started
          </p>

          <div className="space-y-5">
            {/* Step 01 */}
            <div className="flex gap-4">
              <div className="flex-none pt-px">
                <span className="font-mono text-xs text-muted select-none">01</span>
              </div>
              <div className="flex-1">
                <ApiKeyInput value={apiKey} onChange={setApiKey} />
              </div>
            </div>

            {/* Connector */}
            <div className="flex gap-4">
              <div className="flex-none flex justify-center w-[18px]">
                <div className="w-px flex-1 bg-border" />
              </div>
              <div className="flex-1" />
            </div>

            {/* Step 02 */}
            <div className="flex gap-4">
              <div className="flex-none pt-px">
                <span className="font-mono text-xs text-muted select-none">02</span>
              </div>
              <div className="flex-1">
                <PdfDropzone file={pdfFile} onFileChange={setPdfFile} />
              </div>
            </div>

            {/* Connector */}
            <div className="flex gap-4">
              <div className="flex-none flex justify-center w-[18px]">
                <div className="w-px flex-1 bg-border" />
              </div>
              <div className="flex-1" />
            </div>

            {/* Step 03 — Generate */}
            <div className="flex gap-4">
              <div className="flex-none pt-px">
                <span className="font-mono text-xs text-muted select-none">03</span>
              </div>
              <div className="flex-1">
                <GenerateButton disabled={!canGenerate} onClick={handleGenerate} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-mono text-xs text-muted">
            paper<span style={{ color: "var(--primary)" }}>→</span>colab
          </span>
          <span className="font-mono text-xs text-muted">
            Built for researchers · 2026
          </span>
        </div>
      </footer>
    </div>
  );
}
