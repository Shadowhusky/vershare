"use client";
import { useCallback, useEffect, useState } from "react";
import Workspace from "@/components/shared/Workspace";
import HomeHero from "@/components/shared/HomeHero";
import CreatePanel from "@/components/create/CreatePanel";
import RecentDrops from "@/components/create/RecentDrops";
import { useUploadHistory, HistoryItem } from "@/hooks/use-upload-history";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";

interface Usage {
  used: number;
  limit: number;
}

export default function HomeWorkspace() {
  const t = useT();
  const { email } = useAuth();
  const { history, loading, addItem, updateItem, removeItem } = useUploadHistory(email);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [seen, setSeen] = useState<HistoryItem[]>([]);
  const [seenLoading, setSeenLoading] = useState(!!email);

  const refreshUsage = useCallback(() => {
    if (!email) {
      setUsage(null);
      return;
    }
    fetch("/api/auth/usage")
      .then((r) => (r.ok ? (r.json() as Promise<Usage>) : null))
      .then((d) => d && setUsage(d))
      .catch(() => {});
  }, [email]);

  const refreshSeen = useCallback(() => {
    if (!email) {
      setSeen([]);
      setSeenLoading(false);
      return;
    }
    setSeenLoading(true);
    fetch("/api/auth/seen")
      .then((r) => (r.ok ? (r.json() as Promise<{ history: HistoryItem[] }>) : { history: [] }))
      .then((d) => setSeen(d.history || []))
      .catch(() => setSeen([]))
      .finally(() => setSeenLoading(false));
  }, [email]);

  useEffect(() => {
    refreshUsage();
    refreshSeen();
  }, [refreshUsage, refreshSeen]);

  const onCreated = (item: HistoryItem) => {
    addItem(item);
    refreshUsage();
  };

  const changeExpiry = async (shareId: string, expiry: "extend" | "permanent" | "temporary") => {
    const res = await fetch(`/api/shares/${shareId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiry }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { expiresAt: string | null };
    updateItem(shareId, { expires_at: data.expiresAt });
    return true;
  };

  const deleteShare = async (shareId: string) => {
    const res = await fetch(`/api/shares/${shareId}`, { method: "DELETE" });
    if (!res.ok) return false;
    removeItem(shareId);
    window.dispatchEvent(new CustomEvent("vershare:close-share", { detail: { id: shareId } }));
    refreshUsage();
    return true;
  };

  const sidebarHiddenOnMobile =
    !loading && history.length === 0 && seen.length === 0;

  return (
    <div className="lg:grid lg:h-full lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] lg:gap-6">
      {/* Large work panel — DOM-first so mobile stacks the form on top */}
      <section className="lg:col-start-2 lg:row-start-1 lg:min-h-0">
        <Workspace
          className="lg:h-full lg:min-h-0 lg:overflow-y-auto"
          onActiveChange={setActiveId}
        >
          <div className="space-y-4 sm:space-y-6">
            <HomeHero />
            <CreatePanel onCreated={onCreated} />
          </div>
        </Workspace>
      </section>

      {/* Drops pane — small panel, pinned left on desktop, below on mobile */}
      <aside
        aria-label={t("create.recentDrops")}
        className={`mt-8 lg:mt-0 lg:col-start-1 lg:row-start-1 lg:min-h-0 flex-col pixel-border bg-pixel-dark/40 ${
          sidebarHiddenOnMobile ? "hidden lg:flex" : "flex"
        }`}
      >
        <RecentDrops
          history={history}
          seen={seen}
          loading={loading}
          seenLoading={seenLoading}
          activeId={activeId}
          canEdit={!!email}
          usage={usage}
          onChangeExpiry={changeExpiry}
          onDelete={deleteShare}
        />
      </aside>
    </div>
  );
}
