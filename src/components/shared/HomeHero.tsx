"use client";
import { useT } from "@/lib/i18n";

export default function HomeHero() {
  const t = useT();
  return (
    <div className="text-center space-y-1 py-1">
      <h2 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-glow text-xs sm:text-base tracking-wider">
        {t("home.heading")}
      </h2>
      <p className="text-pixel-gray text-xs sm:text-sm max-w-md mx-auto">
        {t("home.subtitle.share")}{" "}
        <span className="text-pixel-cyan">{t("home.subtitle.server")}</span>{" "}
        {t("home.subtitle.or")}{" "}
        <span className="text-pixel-purple">{t("home.subtitle.p2p")}</span>{" "}
        {t("home.subtitle.mode")}
      </p>
    </div>
  );
}
