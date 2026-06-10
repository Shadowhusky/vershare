"use client";
import { useT } from "@/lib/i18n";

export default function LimitsDoc() {
  const t = useT();
  return (
    <div className="space-y-4">
      <div className="pixel-border p-4 bg-pixel-dark/30">
        <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-amber text-xs mb-3">
          {t("doc.limits.size.title")}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-pixel-green/10 text-pixel-gray/50">
              <th className="text-left py-1">{t("doc.limits.size.colType")}</th>
              <th className="text-left py-1">{t("doc.limits.size.colMaxSize")}</th>
              <th className="text-left py-1">{t("doc.limits.size.colStorage")}</th>
            </tr>
          </thead>
          <tbody className="text-pixel-gray">
            <tr className="border-b border-pixel-green/5">
              <td className="py-1.5">{t("doc.limits.size.rowText")}</td>
              <td className="py-1.5 text-pixel-amber">5 MB</td>
              <td className="py-1.5">{t("doc.limits.size.storageInline")}</td>
            </tr>
            <tr className="border-b border-pixel-green/5">
              <td className="py-1.5">{t("doc.limits.size.rowImages")}</td>
              <td className="py-1.5 text-pixel-amber">20 MB</td>
              <td className="py-1.5">{t("doc.limits.size.storageDisk")}</td>
            </tr>
            <tr>
              <td className="py-1.5">{t("doc.limits.size.rowFiles")}</td>
              <td className="py-1.5 text-pixel-amber">50 MB</td>
              <td className="py-1.5">{t("doc.limits.size.storageDisk")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="pixel-border p-4 bg-pixel-dark/30">
        <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-cyan text-xs mb-3">
          {t("doc.limits.formats.title")}
        </p>
        <div className="space-y-2 text-sm text-pixel-gray">
          <p>
            <span className="text-pixel-cyan">{t("doc.limits.formats.images")}</span> PNG, JPEG, GIF,
            WebP, SVG
          </p>
          <p>
            <span className="text-pixel-cyan">{t("doc.limits.formats.code")}</span> JavaScript,
            TypeScript, Python, Java, C, C++, C#, Go, Rust, Ruby, PHP, Swift,
            Kotlin, HTML, CSS, SQL, Bash, JSON, YAML, XML, Markdown, {t("doc.limits.formats.plaintext")}
          </p>
          <p>
            <span className="text-pixel-cyan">{t("doc.limits.formats.files")}</span> {t("doc.limits.formats.anyMime")}
          </p>
        </div>
      </div>

      <div className="pixel-border p-4 bg-pixel-dark/30">
        <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-amber text-xs mb-3">
          {t("doc.limits.lifecycle.title")}
        </p>
        <div className="space-y-2 text-sm text-pixel-gray">
          <p>{t("doc.limits.lifecycle.expiry")}</p>
          <p>{t("doc.limits.lifecycle.grace")}</p>
          <p className="text-pixel-pink/80">{t("doc.limits.lifecycle.purge")}</p>
        </div>
      </div>

      <div className="pixel-border p-4 bg-pixel-dark/30">
        <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-pink text-xs mb-3">
          {t("doc.limits.errors.title")}
        </p>
        <div className="space-y-1 text-sm text-pixel-gray">
          <p>
            <code className="text-pixel-pink">400</code> — {t("doc.limits.errors.400")}
          </p>
          <p>
            <code className="text-pixel-pink">404</code> — {t("doc.limits.errors.404")}
          </p>
          <p>
            <code className="text-pixel-pink">500</code> — {t("doc.limits.errors.500")}
          </p>
        </div>
      </div>

      <div className="pixel-border p-4 bg-pixel-dark/30">
        <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-purple text-xs mb-3">
          {t("doc.limits.p2p.title")}
        </p>
        <p className="text-sm text-pixel-gray">{t("doc.limits.p2p.body")}</p>
      </div>
    </div>
  );
}
