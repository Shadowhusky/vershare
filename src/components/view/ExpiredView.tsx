"use client";
import { useState } from "react";
import { Clock, Infinity as InfinityIcon, RotateCcw, Loader2, Trash2 } from "lucide-react";
import { EXPIRED_RETENTION_MS, EXPIRED_RETENTION_DAYS } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

interface ExpiredViewProps {
  shareId?: string;
  isOwner?: boolean;
  expiresAt?: string | null;
  gone?: boolean;
}

export default function ExpiredView({ shareId, isOwner, expiresAt, gone }: ExpiredViewProps) {
  const t = useT();
  const { email, verified } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const renew = async (expiry: "extend" | "permanent") => {
    if (!shareId) return;
    setBusy(expiry);
    setError("");
    try {
      const res = await fetch(`/api/shares/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiry }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, any>;
        throw new Error(data.error || t("view.renew.failed"));
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("view.renew.failed"));
      setBusy(null);
    }
  };

  if (gone) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
        <Trash2 size={48} className="text-pixel-pink" />
        <h2 className="font-[family-name:var(--font-pixel-stack)] text-pixel-pink text-base">
          {t("view.gone.title")}
        </h2>
        <p className="text-pixel-gray text-sm max-w-sm">
          {t("view.gone.body", { days: EXPIRED_RETENTION_DAYS })}
        </p>
        <a
          href="/"
          className="px-6 py-3 border-2 border-pixel-green text-pixel-green font-[family-name:var(--font-pixel-stack)] text-sm hover:bg-pixel-green/10 transition-all"
        >
          {t("view.backHome")}
        </a>
      </div>
    );
  }

  const deleteDate = expiresAt
    ? new Date(new Date(expiresAt).getTime() + EXPIRED_RETENTION_MS)
        .toISOString()
        .slice(0, 10)
    : null;

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
      <Clock size={48} className="text-pixel-amber" />
      <h2 className="font-[family-name:var(--font-pixel-stack)] text-pixel-amber text-base">
        {t("view.expired.title")}
      </h2>
      <p className="text-pixel-gray text-sm max-w-sm">
        {isOwner
          ? t("view.expired.bodyOwner")
          : email
            ? t("view.expired.bodyAuthed")
            : t("view.expired.body")}
      </p>

      {deleteDate && (
        <p className="text-pixel-amber/80 text-sm max-w-sm border border-pixel-amber/30 px-4 py-2">
          {isOwner
            ? t("view.expired.recoverUntil", { date: deleteDate, days: EXPIRED_RETENTION_DAYS })
            : t("view.expired.deletedAfter", { date: deleteDate })}
        </p>
      )}

      {isOwner && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <button
            onClick={() => renew("extend")}
            disabled={busy !== null}
            className="flex items-center gap-2 px-5 py-3 border-2 border-pixel-amber text-pixel-amber font-[family-name:var(--font-pixel-stack)] text-sm hover:bg-pixel-amber/10 transition-all disabled:opacity-50"
          >
            {busy === "extend" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            {t("view.renew.extend")}
          </button>
          {verified && (
            <button
              onClick={() => renew("permanent")}
              disabled={busy !== null}
              className="flex items-center gap-2 px-5 py-3 border-2 border-pixel-green text-pixel-green font-[family-name:var(--font-pixel-stack)] text-sm hover:bg-pixel-green/10 transition-all disabled:opacity-50"
            >
              {busy === "permanent" ? <Loader2 size={14} className="animate-spin" /> : <InfinityIcon size={14} />}
              {t("view.renew.permanent")}
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="text-pixel-pink text-sm font-[family-name:var(--font-pixel-stack)]">! {error}</p>
      )}

      <a
        href="/"
        className="px-6 py-3 border-2 border-pixel-green text-pixel-green font-[family-name:var(--font-pixel-stack)] text-sm hover:bg-pixel-green/10 transition-all"
      >
        {t("view.backHome")}
      </a>
    </div>
  );
}
