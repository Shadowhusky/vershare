"use client";
import { useT } from "@/lib/i18n";

interface TextTabProps {
  content: string;
  onChange: (content: string) => void;
}

export default function TextTab({ content, onChange }: TextTabProps) {
  const t = useT();
  return (
    <div className="space-y-3">
      <label className="text-pixel-gray text-sm block">
        <span className="text-pixel-green/50">&gt;</span> {t("create.textTab.label")}
      </label>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("create.textTab.placeholder")}
        className="pixel-input min-h-[120px] sm:min-h-[250px] resize-y text-base leading-relaxed"
      />
    </div>
  );
}
