"use client";
import { useState } from "react";
import Workspace from "@/components/shared/Workspace";
import HomeHero from "@/components/shared/HomeHero";
import CreatePanel from "@/components/create/CreatePanel";
import RecentDrops from "@/components/create/RecentDrops";
import { useUploadHistory } from "@/hooks/use-upload-history";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";

export default function HomeWorkspace() {
  const t = useT();
  const { email } = useAuth();
  const { history, loading, addItem, updateItem } = useUploadHistory(email);
  const [activeId, setActiveId] = useState<string | null>(null);

  const changeExpiry = async (shareId: string, expiry: "extend" | "permanent") => {
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

  const sidebarHiddenOnMobile = !loading && history.length === 0;

  return (
    <div className="lg:grid lg:h-full lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
      {/* Large work panel — DOM-first so mobile stacks the form on top */}
      <section className="lg:col-start-2 lg:row-start-1 lg:min-h-0">
        <Workspace
          className="lg:h-full lg:min-h-0 lg:overflow-y-auto"
          onActiveChange={setActiveId}
        >
          <div className="space-y-4 sm:space-y-6">
            <HomeHero />
            <CreatePanel onCreated={addItem} />
          </div>
        </Workspace>
      </section>

      {/* Recents pane — small panel, pinned left on desktop, below on mobile */}
      <aside
        aria-label={t("create.recentDrops")}
        className={`mt-8 lg:mt-0 lg:col-start-1 lg:row-start-1 lg:min-h-0 flex-col pixel-border bg-pixel-dark/40 ${
          sidebarHiddenOnMobile ? "hidden lg:flex" : "flex"
        }`}
      >
        <RecentDrops
          history={history}
          loading={loading}
          activeId={activeId}
          canEdit={!!email}
          onChangeExpiry={changeExpiry}
        />
      </aside>
    </div>
  );
}
