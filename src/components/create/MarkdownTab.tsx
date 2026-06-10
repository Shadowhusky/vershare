"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useT } from "@/lib/i18n";

interface MarkdownTabProps {
  content: string;
  onChange: (content: string) => void;
}

export default function MarkdownTab({ content, onChange }: MarkdownTabProps) {
  const t = useT();
  const [preview, setPreview] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-pixel-gray text-sm">
          <span className="text-pixel-green/50">&gt;</span> {t("create.markdownTab.label")}
        </label>
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className="text-sm px-3 py-1 border border-pixel-green/30 text-pixel-green hover:bg-pixel-green/10 transition-colors"
        >
          {preview ? t("create.markdownTab.edit") : t("create.markdownTab.preview")}
        </button>
      </div>

      {preview ? (
        <div className="pixel-border p-4 min-h-[120px] sm:min-h-[250px] markdown-content bg-pixel-dark/50">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("create.markdownTab.placeholder")}
          className="pixel-input min-h-[120px] sm:min-h-[250px] resize-y text-base leading-relaxed"
        />
      )}
    </div>
  );
}
