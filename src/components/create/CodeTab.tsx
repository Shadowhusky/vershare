"use client";
import { CODE_LANGUAGES } from "@/lib/constants";
import { useT } from "@/lib/i18n";

interface CodeTabProps {
  content: string;
  language: string;
  onContentChange: (content: string) => void;
  onLanguageChange: (language: string) => void;
}

export default function CodeTab({
  content,
  language,
  onContentChange,
  onLanguageChange,
}: CodeTabProps) {
  const t = useT();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <label className="text-pixel-gray text-sm shrink-0">
          <span className="text-pixel-green/50">&gt;</span> {t("create.codeTab.label")}
        </label>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="pixel-input py-1 px-2 text-sm w-auto text-pixel-cyan"
        >
          {CODE_LANGUAGES.map((lang) => (
            <option key={lang} value={lang} className="bg-pixel-dark">
              {lang}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={t("create.codeTab.placeholder")}
        className="pixel-input min-h-[120px] sm:min-h-[250px] resize-y text-base leading-relaxed font-mono"
        spellCheck={false}
      />
    </div>
  );
}
