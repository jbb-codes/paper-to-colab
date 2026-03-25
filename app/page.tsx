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

// Status step advancement timing (ms between step increments)
const STEP_INTERVAL = 3500;

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [appState, setAppState] = useState<AppState>("form");
  const [processingStep, setProcessingStep] = useState(0);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const canGenerate = apiKey.trim().length > 0 && pdfFile !== null;

  const advanceStep = useCallback((
    setter: React.Dispatch<React.SetStateAction<number>>,
    maxSteps: number
  ) => {
    const intervals: ReturnType<typeof setInterval>[] = [];
    for (let i = 1; i < maxSteps; i++) {
      const delay = i * STEP_INTERVAL;
      const id = setTimeout(() => {
        setter(i);
      }, delay);
      intervals.push(id as unknown as ReturnType<typeof setInterval>);
    }
    return () => intervals.forEach(clearTimeout);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!pdfFile || !apiKey.trim()) return;

    setAppState("processing");
    setProcessingStep(0);
    setErrorMessage("");

    // Start cycling through status messages
    const cleanup = advanceStep(setProcessingStep, 7);

    try {
      // Step 1: Extract text from PDF
      const formData = new FormData();
      formData.append("file", pdfFile);

      const extractRes = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const extractData = await extractRes.json();

      if (!extractRes.ok) {
        throw new Error(extractData.error ?? "Failed to extract PDF text");
      }

      const { text: paperText } = extractData as { text: string; pageCount: number };

      // Advance to step 2 for generation
      setProcessingStep(1);

      // Step 2: Generate notebook
      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperText, apiKey: apiKey.trim() }),
      });

      const generateData = await generateRes.json();

      if (!generateRes.ok) {
        throw new Error(generateData.error ?? "Failed to generate notebook");
      }

      const { notebookJson, filename, colabUrl } = generateData as {
        notebookJson: string;
        filename: string;
        colabUrl?: string | null;
        gistError?: string;
      };

      // Advance to final step
      setProcessingStep(6);

      cleanup();

      // Small delay to show final step
      await new Promise((r) => setTimeout(r, 800));

      setResultData({ notebookJson, filename, colabUrl });
      setAppState("result");
    } catch (err: unknown) {
      cleanup();
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(message);
      setAppState("error");
    }
  }, [apiKey, pdfFile, advanceStep]);

  const handleReset = useCallback(() => {
    setAppState("form");
    setProcessingStep(0);
    setResultData(null);
    setErrorMessage("");
    // Keep apiKey and pdfFile so user can quickly retry
  }, []);

  // Render based on state
  if (appState === "processing") {
    return <ProcessingView currentStep={processingStep} />;
  }

  if (appState === "result" && resultData) {
    return (
      <ResultView
        notebookJson={resultData.notebookJson}
        filename={resultData.filename}
        colabUrl={resultData.colabUrl ?? undefined}
        onReset={handleReset}
      />
    );
  }

  if (appState === "error") {
    return <ErrorView message={errorMessage} onReset={handleReset} />;
  }

  // Default: form state
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-4">
            paper-to-colab
          </p>
          <h1
            data-testid="headline"
            className="text-3xl font-semibold text-highlight leading-tight mb-4"
          >
            Research Paper → Colab Notebook
          </h1>
          <p
            data-testid="subheading"
            className="text-muted text-sm leading-relaxed"
          >
            Upload a PDF. Get a production-quality Google Colab notebook
            implementing the paper&apos;s algorithms — with synthetic data,
            visualizations, and a full tutorial narrative.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <ApiKeyInput value={apiKey} onChange={setApiKey} />
          <PdfDropzone file={pdfFile} onFileChange={setPdfFile} />
          <GenerateButton
            disabled={!canGenerate}
            onClick={handleGenerate}
          />
        </div>
      </div>
    </main>
  );
}
