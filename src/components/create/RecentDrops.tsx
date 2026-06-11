"use client";
import { useEffect, useRef, useState } from "react";
import {
  Clock,
  Infinity as InfinityIcon,
  RotateCcw,
  Trash2,
  MoreHorizontal,
  Search,
  ExternalLink,
  Link2,
  Bot,
} from "lucide-react";
import { HistoryItem } from "@/hooks/use-upload-history";
import { formatFileSize } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

const MOBILE_PREVIEW_COUNT = 6;
type ExpiryAction = "extend" | "permanent" | "temporary";
type Section = "mine" | "seen";

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

function openShare(h: HistoryItem) {
  window.dispatchEvent(
    new CustomEvent("vershare:open-share", {
      detail: { id: h.share_id, title: h.title || h.file_name || h.share_id },
    })
  );
  if (window.innerWidth < 1024) {
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }
}

interface RecentDropsProps {
  history: HistoryItem[];
  seen: HistoryItem[];
  loading: boolean;
  seenLoading: boolean;
  activeId: string | null;
  canEdit: boolean;
  usage: { used: number; limit: number } | null;
  onChangeExpiry: (shareId: string, expiry: ExpiryAction) => Promise<boolean>;
  onDelete: (shareId: string) => Promise<boolean>;
}

export default function RecentDrops({
  history,
  seen,
  loading,
  seenLoading,
  activeId,
  canEdit,
  usage,
  onChangeExpiry,
  onDelete,
}: RecentDropsProps) {
  const t = useT();
  const [section, setSection] = useState<Section>("mine");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<HistoryItem | null>(null);

  const sourceList = section === "mine" ? history : seen;
  const isLoading = section === "mine" ? loading : seenLoading;
  const q = query.trim().toLowerCase();
  const list = q
    ? sourceList.filter((h) =>
        `${h.title ?? ""} ${h.file_name ?? ""} ${h.share_id}`.toLowerCase().includes(q)
      )
    : sourceList;
  const editable = section === "mine" && canEdit;
  const visible = showAll ? list : list.slice(0, MOBILE_PREVIEW_COUNT);

  return (
    <>
      {/* Section switch (only when signed in — "shared with me" needs an account) */}
      {canEdit ? (
        <div className="shrink-0 flex border-b-2 [border-color:var(--pixel-border)]" role="tablist">
          {(["mine", "seen"] as Section[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={section === s}
              onClick={() => {
                setSection(s);
                setShowAll(false);
              }}
              className={`flex-1 px-2 py-2 text-[10px] font-[family-name:var(--font-pixel-stack)] transition-colors ${
                section === s
                  ? "text-pixel-green border-b-2 border-pixel-green -mb-0.5"
                  : "text-pixel-gray hover:text-pixel-green"
              }`}
            >
              {s === "mine" ? t("panel.myDrops") : t("panel.sharedWithMe")}
            </button>
          ))}
        </div>
      ) : (
        <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b-2 [border-color:var(--pixel-border)]">
          <span className="font-[family-name:var(--font-pixel-stack)] text-xs text-pixel-gray">
            ▸ {t("create.recentDrops")}
          </span>
          <span className="text-xs text-pixel-gray/60">{history.length}</span>
        </div>
      )}

      {/* Search */}
      <div className="shrink-0 p-1.5 border-b [border-color:var(--pixel-border)]">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--pixel-input-bg)] border [border-color:var(--pixel-border)]">
          <Search size={12} className="text-pixel-gray shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("panel.search")}
            className="w-full bg-transparent text-xs text-pixel-text placeholder:text-pixel-gray/60 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 lg:min-h-0 lg:overflow-y-auto overscroll-contain p-1.5 space-y-1">
        {isLoading &&
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-[52px] bg-[var(--pixel-accent-05)] animate-pulse" />
          ))}

        {!isLoading && list.length === 0 && (
          <div className="animate-fade-in m-2 py-10 px-4 border-2 border-dashed [border-color:var(--pixel-border)] text-center space-y-3">
            <p className="text-pixel-gray text-base">(=^･ω･^=)</p>
            <p className="font-[family-name:var(--font-pixel-stack)] text-xs text-pixel-gray pixel-cursor">
              {q
                ? t("panel.noResults")
                : section === "seen"
                  ? t("seen.empty.title")
                  : t("recents.empty.title")}
            </p>
            {!q && (
              <p className="text-xs text-pixel-gray/70">
                {section === "seen" ? t("seen.empty.body") : t("recents.empty.body")}
              </p>
            )}
          </div>
        )}

        {!isLoading && list.length > 0 && (
          <>
            <div className="animate-fade-in hidden lg:block space-y-1">
              {list.map((h) => (
                <Row
                  key={h.share_id}
                  item={h}
                  active={activeId === h.share_id}
                  editable={editable}
                  onChangeExpiry={onChangeExpiry}
                  onRequestDelete={setPendingDelete}
                />
              ))}
            </div>
            <div className="animate-fade-in lg:hidden space-y-1">
              {visible.map((h) => (
                <Row
                  key={h.share_id}
                  item={h}
                  active={activeId === h.share_id}
                  editable={editable}
                  onChangeExpiry={onChangeExpiry}
                  onRequestDelete={setPendingDelete}
                />
              ))}
              {list.length > MOBILE_PREVIEW_COUNT && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full py-2 border-2 [border-color:var(--pixel-border)] font-[family-name:var(--font-pixel-stack)] text-xs text-pixel-gray hover:text-pixel-green transition-colors"
                >
                  {t("recents.showAll", { count: list.length })}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Storage usage — frame always reserved so the bar never pops the layout */}
      {canEdit && section === "mine" && <UsageBar usage={usage} />}

      <ConfirmDialog
        open={!!pendingDelete}
        title={t("delete.title")}
        message={t("delete.message", {
          name: pendingDelete?.title || pendingDelete?.file_name || pendingDelete?.share_id || "",
        })}
        confirmLabel={t("delete.confirm")}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.share_id);
          setPendingDelete(null);
        }}
      />
    </>
  );
}

function UsageBar({ usage }: { usage: { used: number; limit: number } | null }) {
  const t = useT();
  const pct = usage ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const near = pct >= 90;
  return (
    <div className="shrink-0 px-3 py-2 border-t-2 [border-color:var(--pixel-border)] space-y-1">
      <div className="flex items-center justify-between text-[10px] font-[family-name:var(--font-pixel-stack)]">
        <span className="text-pixel-gray">{t("usage.label")}</span>
        {usage ? (
          <span className={`animate-fade-in ${near ? "text-pixel-pink" : "text-pixel-gray"}`}>
            {formatFileSize(usage.used)} / {formatFileSize(usage.limit)}
          </span>
        ) : (
          <span className="text-pixel-gray/40">···</span>
        )}
      </div>
      <div className="h-2 w-full bg-[var(--pixel-accent-05)] border [border-color:var(--pixel-border)] overflow-hidden">
        <div
          className={`h-full transition-[width] duration-300 ${near ? "bg-pixel-pink" : "bg-pixel-green"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Row({
  item,
  active,
  editable,
  onChangeExpiry,
  onRequestDelete,
}: {
  item: HistoryItem;
  active: boolean;
  editable: boolean;
  onChangeExpiry: (shareId: string, expiry: ExpiryAction) => Promise<boolean>;
  onRequestDelete: (h: HistoryItem) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const expired = !!item.expires_at && new Date(item.expires_at) < new Date();
  const permanent = item.expires_at === null;

  const change = async (expiry: ExpiryAction) => {
    setBusy(true);
    await onChangeExpiry(item.share_id, expiry).catch(() => false);
    setBusy(false);
  };

  return (
    <div
      className={`flex items-stretch transition-colors ${
        active
          ? "bg-[var(--pixel-accent-10)] shadow-[inset_3px_0_0_var(--pixel-green)]"
          : "hover:bg-[var(--pixel-accent-05)]"
      } ${expired ? "opacity-60" : ""}`}
    >
      <button
        onClick={() => openShare(item)}
        aria-current={active || undefined}
        className="flex-1 min-w-0 px-3 py-2 text-left"
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
          {permanent ? (
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

      {/* Action cluster — reserves its own width so it never overlaps the text */}
      <div className="shrink-0 flex items-center gap-0.5 pr-1.5 pl-0.5">
        <RowMenu
          item={item}
          editable={editable}
          permanent={permanent}
          busy={busy}
          onChange={change}
        />
        {editable && (
          <button
            onClick={() => onRequestDelete(item)}
            title={t("delete.action")}
            aria-label={t("delete.action")}
            className="p-1.5 text-pixel-gray/60 hover:text-pixel-pink transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function RowMenu({
  item,
  editable,
  permanent,
  busy,
  onChange,
}: {
  item: HistoryItem;
  editable: boolean;
  permanent: boolean;
  busy: boolean;
  onChange: (expiry: ExpiryAction) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onClick = () => close();
    document.addEventListener("keydown", onKey);
    // defer so the opening click doesn't immediately close it
    const id = setTimeout(() => document.addEventListener("click", onClick), 0);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      clearTimeout(id);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      setCoords({ top: r.bottom + 4, right: window.innerWidth - r.right });
      setOpen(true);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => {});

  const items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[] = [
    { label: t("menu.open"), icon: <ExternalLink size={12} />, onClick: () => openShare(item) },
    { label: t("menu.copyLink"), icon: <Link2 size={12} />, onClick: () => copy(`${origin}/s/${item.share_id}`) },
    { label: t("menu.copyAgentLink"), icon: <Bot size={12} />, onClick: () => copy(`${origin}/api/shares/${item.share_id}/raw`) },
  ];
  if (editable) {
    if (permanent) {
      items.push({ label: t("view.expiry.makeTemporary"), icon: <Clock size={12} />, onClick: () => onChange("temporary") });
    } else {
      items.push({ label: t("view.expiry.extend"), icon: <RotateCcw size={12} />, onClick: () => onChange("extend") });
      items.push({ label: t("view.expiry.makePermanent"), icon: <InfinityIcon size={12} />, onClick: () => onChange("permanent") });
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        disabled={busy}
        title={t("menu.more")}
        aria-label={t("menu.more")}
        aria-expanded={open}
        className="p-1.5 text-pixel-gray/60 hover:text-pixel-green transition-colors disabled:opacity-50"
      >
        <MoreHorizontal size={13} />
      </button>
      {open && coords && (
        <div
          className="fixed z-[60] min-w-[176px] border-2 [border-color:var(--pixel-accent-40)] bg-pixel-darker shadow-[4px_4px_0_var(--pixel-accent-15)]"
          style={{ top: coords.top, right: coords.right }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => {
                it.onClick();
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                it.danger
                  ? "text-pixel-pink hover:bg-pixel-pink/10"
                  : "text-pixel-gray hover:text-pixel-green hover:bg-[var(--pixel-accent-05)]"
              }`}
            >
              {it.icon}
              <span className="truncate">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
