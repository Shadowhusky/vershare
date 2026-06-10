"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, ImageIcon, FileIcon, Type } from "lucide-react";
import { MAX_FILE_SIZE, MAX_IMAGE_SIZE, formatFileSize } from "@/lib/constants";
import { ShareType } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface SmartDropZoneProps {
  onDetect: (result: SmartDetectResult) => void;
  injectText?: string | null;
}

export interface SmartDetectResult {
  type: ShareType;
  content?: string;
  file?: File;
  language?: string;
}

// Strong signals — any one of these means markdown
const MD_STRONG = [
  /^#{1,6}\s/m,
  /^\s*```/m,
  /^\|.+\|.+\|$/m,
  /!\[.*?\]\(.*?\)/,
];

// Weak signals — need 2+ to confirm markdown
const MD_WEAK = [
  /^\s*[-*+]\s/m,
  /^\s*\d+\.\s/m,
  /\[.+?\]\(.+?\)/,
  /^\s*>\s/m,
  /\*\*.+?\*\*/,
  /`.+?`/,
  /^\s*---\s*$/m,
];

const CODE_INDICATORS = [
  /^(import|export|from)\s/m,
  /^(const|let|var|function|class|interface|type|enum)\s/m,
  /^(def|async def|class)\s.*:/m,
  /^(package|func|type|struct)\s/m,
  /^\s*(if|else|for|while|switch|case|return|try|catch)\s*[\({]/m,
  /[{};]\s*$/m,
  /=>\s*[{(]/,
  /\)\s*{/,
  /^\s*\/\//m,
  /^\s*#include/m,
  /^\s*using\s+/m,
  /^\s*pub\s+(fn|struct|enum|mod)/m,
];

function detectLanguage(text: string): string | undefined {
  if (/^(import|export|from)\s/m.test(text)) {
    if (/:\s*(string|number|boolean|any|void)\b/.test(text) || /interface\s/.test(text) || /<\w+>/.test(text))
      return "typescript";
    return "javascript";
  }
  if (/^(def |async def |class \w+.*:)/m.test(text)) return "python";
  if (/^(package\s|func\s|type\s+\w+\s+struct)/m.test(text)) return "go";
  if (/^\s*pub\s+(fn|struct|enum|mod)/m.test(text)) return "rust";
  if (/^#include\s/m.test(text)) return "cpp";
  if (/^\s*using\s+(System|namespace)/m.test(text)) return "csharp";
  if (/^(public|private|protected)\s+(static\s+)?(void|class|int|String)/m.test(text)) return "java";
  if (/^<\?php/m.test(text)) return "php";
  if (/^\s*<(!DOCTYPE|html|div|span|head|body)/im.test(text)) return "html";
  if (/^\s*[\w-]+\s*:\s*[^;]+;/m.test(text) && /\{[\s\S]*\}/m.test(text)) return "css";
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/im.test(text)) return "sql";
  if (/^#!/m.test(text)) return "bash";
  if (/^\s*\{[\s\S]*"[\w]+":/m.test(text)) return "json";
  if (/^\w+:\s/m.test(text) && !/[{;]/m.test(text)) return "yaml";
  return undefined;
}

function detectType(text: string): { type: ShareType; language?: string } {
  const trimmed = text.trim();

  // Check markdown — strong signal alone or 2+ weak signals
  const hasStrong = MD_STRONG.some((p) => p.test(trimmed));
  if (hasStrong) return { type: "markdown" };
  const weakScore = MD_WEAK.filter((p) => p.test(trimmed)).length;
  if (weakScore >= 2) return { type: "markdown" };

  // Check code
  const codeScore = CODE_INDICATORS.filter((p) => p.test(trimmed)).length;
  if (codeScore >= 2) {
    const language = detectLanguage(trimmed);
    return { type: "code", language: language || "plaintext" };
  }

  return { type: "text" };
}

export default function SmartDropZone({ onDetect, injectText }: SmartDropZoneProps) {
  const t = useT();
  const [mode, setMode] = useState<"idle" | "text" | "file">("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<ShareType>("text");
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounter = useRef(0);

  const isImage = file?.type.startsWith("image/") ?? false;

  useEffect(() => {
    if (!file || !isImage) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  // External text injection (e.g. from help wizard)
  useEffect(() => {
    if (injectText && mode === "idle") {
      setText(injectText);
      setMode("text");
    }
  }, [injectText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-detect text type as user types
  useEffect(() => {
    if (mode !== "text") return;
    const trimmed = text.trim();
    if (!trimmed) {
      setDetectedType("text");
      return;
    }
    const { type, language } = detectType(trimmed);
    setDetectedType(type);
    onDetect({ type, content: trimmed, language });
  }, [text, mode, onDetect]);

  // Notify on file set
  useEffect(() => {
    if (!file) return;
    const type: ShareType = file.type.startsWith("image/") ? "image" : "file";
    setDetectedType(type);
    onDetect({ type, file });
  }, [file, onDetect]);

  const [sizeError, setSizeError] = useState<string | null>(null);

  const handleFile = useCallback(
    (f: File) => {
      setSizeError(null);
      const maxSize = f.type.startsWith("image/") ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
      if (f.size > maxSize) {
        setSizeError(t("create.smart.fileTooLarge", { size: formatFileSize(f.size), max: formatFileSize(maxSize) }));
        return;
      }
      setFile(f);
      setMode("file");
    },
    [t]
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
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.kind === "file") {
        e.preventDefault();
        const f = item.getAsFile();
        if (f) handleFile(f);
        return;
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setMode("idle");
    setDetectedType("text");
    onDetect({ type: "text", content: "" });
  };

  const clearText = () => {
    setText("");
    setMode("idle");
    setDetectedType("text");
    onDetect({ type: "text", content: "" });
  };

  const TYPE_LABELS: Record<ShareType, { label: string; color: string }> = {
    text: { label: t("create.detected.text"), color: "text-pixel-gray" },
    markdown: { label: t("create.detected.markdown"), color: "text-pixel-purple" },
    code: { label: t("create.detected.code"), color: "text-pixel-cyan" },
    file: { label: t("create.detected.file"), color: "text-pixel-amber" },
    image: { label: t("create.detected.image"), color: "text-pixel-pink" },
  };

  const detected = TYPE_LABELS[detectedType];

  // File mode
  if (mode === "file" && file) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-[family-name:var(--font-pixel-stack)] ${detected.color}`}>
            &gt; {t("create.smart.detected", { type: detected.label })}
          </span>
          <button
            type="button"
            onClick={clearFile}
            className="text-pixel-pink hover:text-pixel-pink/80 p-1"
          >
            <X size={18} />
          </button>
        </div>
        {isImage && preview ? (
          <div className="pixel-border p-2 bg-pixel-dark/50">
            <img
              src={preview}
              alt={t("create.previewAlt")}
              className="max-h-[200px] mx-auto object-contain"
            />
          </div>
        ) : null}
        <div className="pixel-border p-4 flex items-center gap-3 bg-pixel-dark/50">
          {isImage ? (
            <ImageIcon size={24} className="text-pixel-pink" />
          ) : (
            <FileIcon size={24} className="text-pixel-amber" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base text-pixel-cyan truncate">{file.name}</p>
            <p className="text-sm text-pixel-gray">{formatFileSize(file.size)}</p>
          </div>
        </div>
      </div>
    );
  }

  // Text mode
  if (mode === "text") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-[family-name:var(--font-pixel-stack)] ${detected.color}`}>
            &gt; {t("create.smart.detected", { type: detected.label })}
          </span>
          <button
            type="button"
            onClick={clearText}
            className="text-pixel-pink hover:text-pixel-pink/80 p-1"
          >
            <X size={18} />
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          placeholder={t("create.smart.placeholder")}
          className="pixel-input min-h-[120px] sm:min-h-[200px] resize-y text-base leading-relaxed"
          autoFocus
        />
      </div>
    );
  }

  // Idle mode — split drop zone
  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex min-h-[120px] sm:min-h-[180px] transition-all relative ${isDragging ? "dropzone-active" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        className="absolute w-0 h-0 overflow-hidden opacity-0"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {/* Left: Type (narrow) */}
      <button
        type="button"
        onClick={() => setMode("text")}
        className="w-28 shrink-0 dropzone flex flex-col items-center justify-center gap-2 p-4 cursor-pointer border-r-0 hover:bg-pixel-green/5 transition-all"
      >
        <Type size={20} className="text-pixel-green/60" />
        <span className="font-[family-name:var(--font-pixel-stack)] text-xs text-pixel-green/60">
          {t("create.smart.typeButton")}
        </span>
      </button>

      {sizeError && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-pixel-pink/20 border border-pixel-pink/40 text-pixel-pink text-xs font-[family-name:var(--font-pixel-stack)] whitespace-nowrap z-10">
          ! {sizeError}
        </div>
      )}

      {/* Right: Upload (wide) */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex-1 dropzone flex flex-col items-center justify-center gap-3 p-6 cursor-pointer hover:bg-pixel-cyan/5 transition-all"
      >
        <Upload size={28} className={isDragging ? "text-pixel-green" : "text-pixel-cyan/60"} />
        <span className="font-[family-name:var(--font-pixel-stack)] text-sm text-pixel-cyan/60">
          {isDragging ? t("create.smart.release") : t("create.smart.dropOrBrowse")}
        </span>
        <span className="text-pixel-gray/40 text-sm">
          {t("create.smart.hint")}
        </span>
      </button>
    </div>
  );
}
