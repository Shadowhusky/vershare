"use client";
import { useState } from "react";
import { Clock } from "lucide-react";
import { HistoryItem } from "@/hooks/use-upload-history";
import { formatFileSize } from "@/lib/constants";
import { useT } from "@/lib/i18n";

const MOBILE_PREVIEW_COUNT = 6;

function relativeAge(iso: string, nowLabel: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return nowLabel;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}

interface RecentDropsProps {
  history: HistoryItem[];
  loading: boolean;
  activeId: string | null;
}

export default function RecentDrops({ history, loading, activeId }: RecentDropsProps) {
  const t = useT();
  const [showAll, setShowAll] = useState(false);

  const openShare = (h: HistoryItem) => {
    window.dispatchEvent(
      new CustomEvent("vershare:open-share", {
        detail: { id: h.share_id, title: h.title || h.file_name || h.share_id },
      })
    );
    if (window.innerWidth < 1024) {
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const visible = showAll ? history : history.slice(0, MOBILE_PREVIEW_COUNT);

  return (
    <>
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b-2 [border-color:var(--pixel-border)]">
        <span className="font-[family-name:var(--font-pixel-stack)] text-xs text-pixel-gray">
          ▸ {t("create.recentDrops")}
        </span>
        <span className="text-xs text-pixel-gray/60">{history.length}</span>
      </div>

      <div className="flex-1 lg:min-h-0 lg:overflow-y-auto overscroll-contain p-1.5 space-y-1">
        {loading && history.length === 0 &&
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-[52px] bg-[var(--pixel-accent-05)] animate-pulse" />
          ))}

        {!loading && history.length === 0 && (
          <div className="m-2 py-10 px-4 border-2 border-dashed [border-color:var(--pixel-border)] text-center space-y-3">
            <p className="text-pixel-gray text-base">(=^･ω･^=)</p>
            <p className="font-[family-name:var(--font-pixel-stack)] text-xs text-pixel-gray pixel-cursor">
              {t("recents.empty.title")}
            </p>
            <p className="text-xs text-pixel-gray/70">{t("recents.empty.body")}</p>
          </div>
        )}

        {/* Desktop shows the whole history (pane scrolls); mobile previews then expands in flow */}
        <div className="hidden lg:block space-y-1">
          {history.map((h) => (
            <Row key={h.share_id} item={h} active={activeId === h.share_id} onOpen={openShare} />
          ))}
        </div>
        <div className="lg:hidden space-y-1">
          {visible.map((h) => (
            <Row key={h.share_id} item={h} active={activeId === h.share_id} onOpen={openShare} />
          ))}
          {history.length > MOBILE_PREVIEW_COUNT && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2 border-2 [border-color:var(--pixel-border)] font-[family-name:var(--font-pixel-stack)] text-xs text-pixel-gray hover:text-pixel-green transition-colors"
            >
              {t("recents.showAll", { count: history.length })}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function Row({
  item,
  active,
  onOpen,
}: {
  item: HistoryItem;
  active: boolean;
  onOpen: (h: HistoryItem) => void;
}) {
  const t = useT();
  const expired = !!item.expires_at && new Date(item.expires_at) < new Date();

  return (
    <button
      onClick={() => onOpen(item)}
      aria-current={active || undefined}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") (e.currentTarget.nextElementSibling as HTMLElement)?.focus();
        if (e.key === "ArrowUp") (e.currentTarget.previousElementSibling as HTMLElement)?.focus();
      }}
      className={`w-full px-3 py-2 text-left transition-colors ${
        active
          ? "bg-[var(--pixel-accent-10)] shadow-[inset_3px_0_0_var(--pixel-green)]"
          : "hover:bg-[var(--pixel-accent-05)]"
      } ${expired ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`font-[family-name:var(--font-pixel-stack)] text-[9px] w-11 shrink-0 ${
            active ? "bg-pixel-green text-pixel-darker px-0.5" : "text-pixel-gray"
          }`}
        >
          {item.share_type.toUpperCase().slice(0, 4)}
        </span>
        <span className="text-[13px] text-pixel-text truncate">
          {item.title || item.file_name || item.share_id}
        </span>
      </div>
      <div className="mt-0.5 pl-[52px] text-[11px] text-pixel-gray flex items-center gap-2">
        {item.file_size ? <span>{formatFileSize(item.file_size)}</span> : null}
        <span>{relativeAge(item.created_at, t("recents.now"))}</span>
        {item.expires_at === null ? (
          <span>∞</span>
        ) : expired ? (
          <span className="font-[family-name:var(--font-pixel-stack)] text-[9px] text-pixel-amber">
            {t("recents.expired")}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-pixel-amber">
            <Clock size={10} /> {daysLeft(item.expires_at!)}d
          </span>
        )}
      </div>
    </button>
  );
}
