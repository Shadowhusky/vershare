"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function NotFound() {
  const t = useT();
  return (
    <div className="text-center py-20 space-y-6">
      <div className="font-[family-name:var(--font-pixel-stack)] text-pixel-pink text-4xl">
        404
      </div>
      <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-gray text-sm">
        {t("view.notFound.title")}
      </p>
      <p className="text-pixel-gray/60 text-base">
        {t("view.notFound.body")}
      </p>
      <Link
        href="/"
        className="inline-block px-6 py-3 border-2 border-pixel-green/30 text-pixel-green text-sm font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-green/10 hover:border-pixel-green/50 transition-all"
      >
        {t("view.backHome")}
      </Link>
    </div>
  );
}
