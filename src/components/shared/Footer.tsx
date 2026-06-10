"use client";
import { useT } from "@/lib/i18n";

export default function Footer() {
  const t = useT();
  return (
    <footer className="shrink-0 border-t-2 border-pixel-green/20 px-3 py-2 sm:px-8">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-pixel-gray/40 text-[10px]">{t("footer.version")}</p>
      </div>
    </footer>
  );
}
