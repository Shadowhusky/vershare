"use client";
import { useState, useEffect, useCallback } from "react";

export interface HistoryItem {
  share_id: string;
  share_type: string;
  title: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  expires_at: string | null;
}

const LS_KEY = "vershare_upload_history";
const MAX_LOCAL_ITEMS = 50;

function getLocalHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function setLocalHistory(items: HistoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, MAX_LOCAL_ITEMS)));
}

export function useUploadHistory(userEmail: string | null) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load history; on login, first claim anonymous local drops so they
  // become owned by (and visible to) the account everywhere.
  useEffect(() => {
    let cancelled = false;

    const loadServer = () =>
      fetch("/api/auth/history")
        .then((r) => (r.ok ? (r.json() as Promise<{ history: HistoryItem[] }>) : { history: [] }))
        .then((data) => {
          if (!cancelled) setHistory(data.history || []);
        })
        .catch(() => {
          if (!cancelled) setHistory([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

    if (userEmail) {
      const local = getLocalHistory();
      if (local.length > 0) {
        fetch("/api/auth/history/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: local.map((i) => ({ share_id: i.share_id })) }),
        })
          .then((r) => {
            if (r.ok) localStorage.removeItem(LS_KEY);
          })
          .catch(() => {})
          .finally(loadServer);
      } else {
        loadServer();
      }
    } else {
      setHistory(getLocalHistory());
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  // Add item
  const addItem = useCallback(
    (item: HistoryItem) => {
      setHistory((prev) => {
        const next = [item, ...prev.filter((h) => h.share_id !== item.share_id)].slice(0, MAX_LOCAL_ITEMS);
        if (!userEmail) {
          setLocalHistory(next);
        }
        return next;
      });
    },
    [userEmail]
  );

  const updateItem = useCallback(
    (shareId: string, patch: Partial<HistoryItem>) => {
      setHistory((prev) => {
        const next = prev.map((h) => (h.share_id === shareId ? { ...h, ...patch } : h));
        if (!userEmail) {
          setLocalHistory(next);
        }
        return next;
      });
    },
    [userEmail]
  );

  return { history, loading, addItem, updateItem };
}
