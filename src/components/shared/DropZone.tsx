"use client";
import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { useT } from "@/lib/i18n";

interface DropZoneProps {
  onFile: (file: File) => void;
  accept?: string;
  maxSize?: number;
  children?: React.ReactNode;
  label?: string;
}

export default function DropZone({
  onFile,
  accept,
  maxSize,
  children,
  label,
}: DropZoneProps) {
  const t = useT();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (maxSize && file.size > maxSize) {
        setError(t("common.dropzone.fileTooLarge", { max: (maxSize / (1024 * 1024)).toFixed(0) }));
        return;
      }
      if (accept) {
        const acceptedTypes = accept.split(",").map((t) => t.trim());
        const matches = acceptedTypes.some((t) => {
          if (t.startsWith(".")) return file.name.toLowerCase().endsWith(t);
          if (t.endsWith("/*")) return file.type.startsWith(t.replace("/*", "/"));
          return file.type === t;
        });
        if (!matches) {
          setError(t("common.dropzone.typeNotAccepted"));
          return;
        }
      }
      onFile(file);
    },
    [accept, maxSize, onFile, t]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`dropzone p-8 flex flex-col items-center justify-center gap-4 cursor-pointer min-h-[200px] transition-all ${
        isDragging ? "dropzone-active" : ""
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="absolute w-0 h-0 overflow-hidden opacity-0"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {children || (
        <>
          <Upload
            size={32}
            className={`${isDragging ? "text-pixel-green" : "text-pixel-gray"} transition-colors`}
          />
          <p className="font-[family-name:var(--font-pixel-stack)] text-sm text-pixel-gray">
            {isDragging ? t("common.dropzone.release") : (label ?? t("common.dropzone.dropFileHere"))}
          </p>
          <p className="text-pixel-gray/50 text-sm">{t("common.dropzone.clickToBrowse")}</p>
        </>
      )}

      {error && (
        <p className="text-pixel-pink text-sm font-[family-name:var(--font-pixel-stack)]">
          ! {error}
        </p>
      )}
    </div>
  );
}
