"use client";
import { useT } from "@/lib/i18n";

export default function P2PDoc() {
  const t = useT();
  return (
    <div className="space-y-4">
      <p className="text-pixel-gray text-base">
        {t("doc.p2p.intro.before")}{" "}
        <span className="text-pixel-purple">WebRTC</span>{" "}
        {t("doc.p2p.intro.after")}
      </p>
      <div className="pixel-border p-4 bg-pixel-purple/5 space-y-2">
        <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-purple text-xs">
          {t("doc.p2p.flow.title")}
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-pixel-gray">
          <li>
            {t("doc.p2p.flow.step1")}{" "}
            <span className="text-pixel-purple font-bold">{t("doc.p2p.flow.step1Button")}</span>
          </li>
          <li>
            {t("doc.p2p.flow.step2")}{" "}
            <code className="text-pixel-purple/60">/p/&#123;peerId&#125;</code>
          </li>
          <li>{t("doc.p2p.flow.step3")}</li>
          <li>{t("doc.p2p.flow.step4")}</li>
          <li>{t("doc.p2p.flow.step5")}</li>
          <li>{t("doc.p2p.flow.step6")}</li>
        </ol>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="pixel-border p-3 bg-pixel-green/5">
          <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-[11px] mb-1">
            {t("doc.p2p.pros.title")}
          </p>
          <ul className="text-pixel-gray space-y-0.5">
            <li>{t("doc.p2p.pros.item1")}</li>
            <li>{t("doc.p2p.pros.item2")}</li>
            <li>{t("doc.p2p.pros.item3")}</li>
          </ul>
        </div>
        <div className="pixel-border p-3 bg-pixel-amber/5">
          <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-amber text-[11px] mb-1">
            {t("doc.p2p.notes.title")}
          </p>
          <ul className="text-pixel-gray space-y-0.5">
            <li>{t("doc.p2p.notes.item1")}</li>
            <li>{t("doc.p2p.notes.item2")}</li>
            <li>{t("doc.p2p.notes.item3")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
