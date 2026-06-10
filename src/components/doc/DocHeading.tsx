"use client";
import { useT } from "@/lib/i18n";

export default function DocHeading() {
  const t = useT();
  return (
    <h2 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-glow text-base">
      &gt; {t("doc.heading")}
    </h2>
  );
}
