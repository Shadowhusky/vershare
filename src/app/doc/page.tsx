"use client";
import { useT } from "@/lib/i18n";

export default function DocOverview() {
  const t = useT();
  return (
    <div className="space-y-4">
      <p className="text-pixel-gray text-base">
        <span className="text-pixel-green">VerShare</span> — {t("doc.overview.intro")}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { icon: "TXT", c: "green", t: t("doc.overview.card.text.title"), d: t("doc.overview.card.text.desc") },
          { icon: "</>", c: "cyan", t: t("doc.overview.card.code.title"), d: t("doc.overview.card.code.desc") },
          { icon: "FILE", c: "amber", t: t("doc.overview.card.files.title"), d: t("doc.overview.card.files.desc") },
          { icon: "IMG", c: "pink", t: t("doc.overview.card.images.title"), d: t("doc.overview.card.images.desc") },
        ].map((f) => (
          <div key={f.t} className={`pixel-border p-3 text-pixel-${f.c} border-pixel-${f.c}/20 bg-pixel-${f.c}/5`}>
            <p className="font-[family-name:var(--font-pixel-stack)] text-xs mb-1">
              {f.icon} {f.t}
            </p>
            <p className="text-pixel-gray text-sm">{f.d}</p>
          </div>
        ))}
      </div>
      <div className="text-base text-pixel-gray space-y-1">
        <p>
          <span className="text-pixel-cyan">{t("doc.overview.serverMode.label")}</span> — {t("doc.overview.serverMode.desc")}{" "}
          <code className="text-pixel-cyan/60 text-sm">/s/&#123;id&#125;</code>
        </p>
        <p>
          <span className="text-pixel-purple">{t("doc.overview.p2pMode.label")}</span> — {t("doc.overview.p2pMode.desc")}
        </p>
      </div>
      <div className="pixel-border p-3 bg-pixel-green/5 text-sm text-pixel-gray space-y-1">
        <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-2">
          {t("doc.overview.quickStart.title")}
        </p>
        <p>1. {t("doc.overview.quickStart.step1")}</p>
        <p>2. {t("doc.overview.quickStart.step2")}</p>
        <p>
          3. {t("doc.overview.quickStart.step3")}{" "}
          <span className="text-pixel-green">{t("doc.overview.quickStart.step3DropIt")}</span>{" "}
          {t("doc.overview.quickStart.step3Or")}{" "}
          <span className="text-pixel-purple">{t("doc.overview.quickStart.step3P2pDrop")}</span>
        </p>
        <p>4. {t("doc.overview.quickStart.step4")}</p>
      </div>
    </div>
  );
}
