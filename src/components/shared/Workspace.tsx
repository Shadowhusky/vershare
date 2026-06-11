"use client";
import { useEffect, useState, ReactNode } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { ShareMetadata } from "@/lib/types";
import ShareView from "@/components/view/ShareView";
import ExpiredView from "@/components/view/ExpiredView";
import { useT } from "@/lib/i18n";

export interface OpenShareDetail {
  id: string;
  title?: string | null;
}

interface ShareTab {
  id: string;
  title: string;
}

function ShareTabContent({ id }: { id: string }) {
  const t = useT();
  const [share, setShare] = useState<ShareMetadata | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "expired" | "gone" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(`/api/shares/${id}`)
      .then(async (r) => {
        if (cancelled) return;
        if (r.ok) {
          setShare((await r.json()) as ShareMetadata);
          setState("ok");
        } else if (r.status === 410) {
          const data = (await r.json().catch(() => ({}))) as {
            isOwner?: boolean;
            gone?: boolean;
            expiresAt?: string | null;
          };
          if (data.gone) {
            setState("gone");
          } else {
            setIsOwner(!!data.isOwner);
            setExpiresAt(data.expiresAt ?? null);
            setState("expired");
          }
        } else {
          setState("error");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-pixel-green">
        <Loader2 size={16} className="animate-spin" />
        <span className="font-[family-name:var(--font-pixel-stack)] text-sm">
          {t("tabs.loading")}
        </span>
      </div>
    );
  }
  if (state === "gone") {
    return <ExpiredView gone />;
  }
  if (state === "expired") {
    return <ExpiredView shareId={id} isOwner={isOwner} expiresAt={expiresAt} />;
  }
  if (state === "error" || !share) {
    return (
      <p className="text-center py-20 text-pixel-pink font-[family-name:var(--font-pixel-stack)] text-sm">
        ! {t("tabs.loadFailed")}
      </p>
    );
  }
  return <ShareView share={share} />;
}

interface WorkspaceProps {
  children: ReactNode;
  className?: string;
  onActiveChange?: (id: string | null) => void;
}

export default function Workspace({ children, className, onActiveChange }: WorkspaceProps) {
  const t = useT();
  const [tabs, setTabs] = useState<ShareTab[]>([]);
  const [active, setActive] = useState<string>("new");

  useEffect(() => {
    onActiveChange?.(active === "new" ? null : active);
  }, [active, onActiveChange]);

  const closeTab = (id: string) => {
    setTabs((prev) => prev.filter((tab) => tab.id !== id));
    setActive((curr) => (curr === id ? "new" : curr));
  };

  useEffect(() => {
    const onOpen = (e: Event) => {
      const { id, title } = (e as CustomEvent<OpenShareDetail>).detail;
      setTabs((prev) =>
        prev.some((tab) => tab.id === id)
          ? prev
          : [...prev, { id, title: title || id }]
      );
      setActive(id);
    };
    const onClose = (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      setTabs((prev) => prev.filter((tab) => tab.id !== id));
      setActive((curr) => (curr === id ? "new" : curr));
    };
    window.addEventListener("vershare:open-share", onOpen);
    window.addEventListener("vershare:close-share", onClose);
    return () => {
      window.removeEventListener("vershare:open-share", onOpen);
      window.removeEventListener("vershare:close-share", onClose);
    };
  }, []);

  const cycle = (dir: 1 | -1) => {
    const order = ["new", ...tabs.map((tab) => tab.id)];
    const next = order[(order.indexOf(active) + dir + order.length) % order.length];
    setActive(next);
  };

  return (
    <div className={className ?? "space-y-4 sm:space-y-6"}>
      {tabs.length > 0 && (
        <div
          role="tablist"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") cycle(1);
            if (e.key === "ArrowLeft") cycle(-1);
          }}
          className="flex items-end gap-1 overflow-x-auto border-b-2 border-pixel-green/20 sticky top-0 z-20 bg-pixel-darker mb-4 sm:mb-6"
        >
          <button
            role="tab"
            aria-selected={active === "new"}
            onClick={() => setActive("new")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-[family-name:var(--font-pixel-stack)] shrink-0 ${
              active === "new" ? "tab-active" : "tab-inactive"
            }`}
          >
            <Plus size={12} />
            {t("create.newDrop")}
          </button>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center shrink-0 max-w-[180px] ${
                active === tab.id ? "tab-active" : "tab-inactive"
              }`}
            >
              <button
                role="tab"
                aria-selected={active === tab.id}
                onClick={() => setActive(tab.id)}
                className="px-3 py-2 text-xs truncate"
                title={tab.title}
              >
                {tab.title}
              </button>
              <button
                onClick={() => closeTab(tab.id)}
                className="pr-2 text-pixel-gray/50 hover:text-pixel-pink transition-colors"
                aria-label={t("tabs.close")}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={active === "new" ? "" : "hidden"}>{children}</div>
      {tabs.map((tab) => (
        <div key={tab.id} className={active === tab.id ? "" : "hidden"}>
          <ShareTabContent id={tab.id} />
        </div>
      ))}
    </div>
  );
}
