"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";

interface PdfDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export default function PdfDropzone({ file, onFileChange }: PdfDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
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
    if (dropped && dropped.type === "application/pdf") {
      onFileChange(dropped);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected) onFileChange(selected);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-mono text-muted mb-2 uppercase tracking-widest">
        Research Paper PDF
      </label>
      <div
        data-testid="pdf-dropzone"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragOver
              ? "border-accent bg-surface/80 scale-[1.01]"
              : file
              ? "border-accent/60 bg-surface/40"
              : "border-border hover:border-muted bg-surface/20 hover:bg-surface/40"
          }
        `}
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
          <div className="animate-fade-in">
            <div className="text-accent font-mono text-sm mb-1">
              {file.name}
            </div>
            <div className="text-muted text-xs font-mono">
              {(file.size / 1024 / 1024).toFixed(2)} MB — click to change
            </div>
          </div>
        ) : (
          <div>
            <div className="text-muted text-sm font-mono mb-2">
              {isDragOver ? "Drop PDF here" : "Drag & drop PDF or click to browse"}
            </div>
            <div className="text-xs text-muted/60 font-mono">
              Max 20 MB · PDF only
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
