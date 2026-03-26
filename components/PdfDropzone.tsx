"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";

interface PdfDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

function DocIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function PdfDropzone({ file, onFileChange }: PdfDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.type === "application/pdf" || dropped.name.toLowerCase().endsWith(".pdf"))) onFileChange(dropped);
  };
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected) onFileChange(selected);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-mono text-muted mb-2 uppercase tracking-widest">
        Research Paper PDF
      </label>
      <div
        data-testid="pdf-dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full rounded-lg px-6 py-8 text-center cursor-pointer
          transition-all duration-200 border
          ${
            isDragOver
              ? "border-dashed scale-[1.01]"
              : file
              ? ""
              : "border-dashed hover:border-solid"
          }
        `}
        style={{
          borderColor: isDragOver
            ? "var(--primary)"
            : file
            ? "var(--border)"
            : "var(--border)",
          backgroundColor: isDragOver
            ? "color-mix(in srgb, var(--primary) 6%, var(--surface))"
            : file
            ? "var(--surface)"
            : "transparent",
        }}
      >
        <input
          ref={inputRef}
          data-testid="pdf-file-input"
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          className="sr-only"
          tabIndex={-1}
        />

        {file ? (
          <div className="animate-fade-in flex items-center gap-3 text-left">
            <span style={{ color: "var(--primary)" }}>
              <CheckIcon />
            </span>
            <div className="min-w-0">
              <div className="font-mono text-sm text-highlight truncate">
                {file.name}
              </div>
              <div className="text-xs text-muted font-mono mt-0.5">
                {(file.size / 1024 / 1024).toFixed(2)} MB — click to change
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="text-muted">
              <DocIcon />
            </span>
            <div>
              <div className="text-sm text-highlight font-mono mb-1">
                {isDragOver ? "Drop it here" : "Drag & drop your PDF"}
              </div>
              <div className="text-xs text-muted font-mono">
                or{" "}
                <span style={{ color: "var(--primary)" }}>click to browse</span>
                {" · "}Max 20 MB
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
