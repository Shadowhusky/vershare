"use client";
import { useState } from "react";
import { ShareMetadata } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import TextView from "./TextView";
import MarkdownView from "./MarkdownView";
import CodeView from "./CodeView";
import FileView from "./FileView";
import ImageView from "./ImageView";
import { useClipboard } from "@/hooks/use-clipboard";
import { Copy, Check, Type, FileText, Code, FileIcon, ImageIcon, Clock, Infinity, Share2, Bot } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/locales/en";

const TYPE_META: Record<string, { icon: React.ReactNode; labelKey: TranslationKey }> = {
  text: { icon: <Type size={14} />, labelKey: "view.type.text" },
  markdown: { icon: <FileText size={14} />, labelKey: "view.type.markdown" },
  code: { icon: <Code size={14} />, labelKey: "view.type.code" },
  file: { icon: <FileIcon size={14} />, labelKey: "view.type.file" },
  image: { icon: <ImageIcon size={14} />, labelKey: "view.type.image" },
};

export default function ShareView({ share }: { share: ShareMetadata }) {
  const t = useT();
  const { verified } = useAuth();
  const { copied, copy } = useClipboard();
  const [toast, setToast] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null | undefined>(share.expiresAt);
  const [busy, setBusy] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/s/${share.id}` : "";
  const rawUrl = typeof window !== "undefined" ? `${window.location.origin}/api/shares/${share.id}/raw` : "";
  const meta = TYPE_META[share.type] || TYPE_META.text;
  const isOwner = !!share.isOwner;

  const updateExpiry = async (expiry: "extend" | "permanent") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/shares/${share.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiry }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, any>;
      if (!res.ok) throw new Error(data.error || t("view.renew.failed"));
      setExpiresAt(data.expiresAt);
      showToast(t("view.expiryUpdated"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("view.renew.failed"));
    } finally {
      setBusy(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleCopy = async () => {
    await copy(url);
    showToast(t("view.toast.linkCopied"));
  };

  const handleAgentCopy = async () => {
    await copy(rawUrl);
    showToast(t("view.toast.agentLinkCopied"));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: share.title || "VerShare", url });
        showToast(t("view.toast.shared"));
      } catch {
        // cancelled
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {share.title && (
            <h2 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-base mb-2">
              {share.title}
            </h2>
          )}
          <div className="flex items-center gap-3 text-pixel-gray text-sm flex-wrap">
            <span className="flex items-center gap-1 text-pixel-gray">
              {meta.icon} {t(meta.labelKey)}
            </span>
            <span>·</span>
            <span>{new Date(share.createdAt).toISOString().slice(0, 10)}</span>
            {expiresAt === null ? (
              <><span>·</span><span className="flex items-center gap-1 text-pixel-green"><Infinity size={12} /> {t("view.permanent")}</span></>
            ) : expiresAt ? (
              <><span>·</span><span className="flex items-center gap-1 text-pixel-amber"><Clock size={12} /> {t("view.expiresOn", { date: new Date(expiresAt).toISOString().slice(0, 10) })}</span></>
            ) : null}
            {isOwner && expiresAt !== null && (
              <>
                <span>·</span>
                <button
                  onClick={() => updateExpiry("extend")}
                  disabled={busy}
                  className="text-pixel-amber/80 hover:text-pixel-amber underline underline-offset-2 disabled:opacity-50"
                >
                  {t("view.expiry.extend")}
                </button>
                {verified && (
                  <button
                    onClick={() => updateExpiry("permanent")}
                    disabled={busy}
                    className="text-pixel-green/80 hover:text-pixel-green underline underline-offset-2 disabled:opacity-50"
                  >
                    {t("view.expiry.makePermanent")}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className={`px-3 py-2 border text-sm font-[family-name:var(--font-pixel-stack)] transition-all ${
              copied
                ? "border-pixel-green text-pixel-green bg-pixel-green/10"
                : "border-pixel-green/30 text-pixel-green hover:bg-pixel-green/10"
            }`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <button
            onClick={handleAgentCopy}
            title={t("view.agentLink")}
            aria-label={t("view.agentLink")}
            className="px-3 py-2 border border-pixel-purple/30 text-pixel-purple text-sm font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-purple/10 transition-all"
          >
            <Bot size={12} />
          </button>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              onClick={handleShare}
              className="px-3 py-2 border border-pixel-cyan/30 text-pixel-cyan text-sm font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-cyan/10 transition-all"
            >
              <Share2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {share.type === "text" && share.content && <TextView content={share.content} />}
      {share.type === "markdown" && share.content && <MarkdownView content={share.content} />}
      {share.type === "code" && share.content && <CodeView content={share.content} language={share.language} />}
      {share.type === "file" && <FileView share={share} />}
      {share.type === "image" && <ImageView share={share} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 pixel-border bg-pixel-darker text-pixel-green font-[family-name:var(--font-pixel-stack)] text-sm animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
