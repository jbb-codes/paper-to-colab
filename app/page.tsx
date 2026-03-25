"use client";

import { useState } from "react";
import ApiKeyInput from "@/components/ApiKeyInput";
import PdfDropzone from "@/components/PdfDropzone";
import GenerateButton from "@/components/GenerateButton";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const canGenerate = apiKey.trim().length > 0 && pdfFile !== null;

  const handleGenerate = () => {
    // Will be wired up in Task 9
    console.log("Generate clicked");
  };

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
          <GenerateButton disabled={!canGenerate} onClick={handleGenerate} />
        </div>
      </div>
    </main>
  );
}
