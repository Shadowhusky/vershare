"use client";
import { useClipboard } from "@/hooks/use-clipboard";
import { Copy, Check, Share2 } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function ShareLinkBox({ shareId }: { shareId: string }) {
  const t = useT();
  const { copied, copy } = useClipboard();
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${shareId}`
      : `/s/${shareId}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "VerShare", url });
      } catch {
        // cancelled
      }
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="pixel-border p-4 bg-pixel-green/5">
      <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-sm mb-3 text-glow">
        &gt; {t("common.shareLink.complete")}
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          readOnly
          className="pixel-input flex-1 text-base text-pixel-cyan min-w-0"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={() => copy(url)}
          className={`shrink-0 px-3 py-2 border-2 font-[family-name:var(--font-pixel-stack)] text-sm transition-all ${
            copied
              ? "bg-pixel-green/20 border-pixel-green text-pixel-green"
              : "border-pixel-green/30 text-pixel-green hover:bg-pixel-green/10 hover:border-pixel-green/50"
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        {hasNativeShare && (
          <button
            onClick={handleShare}
            className="shrink-0 px-3 py-2 border-2 border-pixel-cyan/30 text-pixel-cyan font-[family-name:var(--font-pixel-stack)] text-sm hover:bg-pixel-cyan/10 hover:border-pixel-cyan/50 transition-all"
          >
            <Share2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
