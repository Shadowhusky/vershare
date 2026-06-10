"use client";
import { useState, useEffect, useCallback } from "react";
import { Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { ShareMetadata } from "@/lib/types";
import { formatFileSize } from "@/lib/constants";
import SharePreviewModal from "./SharePreviewModal";
import ConfirmDialog from "./ConfirmDialog";

const TYPE_COLORS: Record<string, string> = {
  text: "text-pixel-green",
  markdown: "text-pixel-cyan",
  code: "text-pixel-amber",
  file: "text-pixel-pink",
  image: "text-pixel-purple",
};

const TYPES = ["all", "text", "markdown", "code", "file", "image"];

export default function SharesTable({ onDataChange }: { onDataChange?: () => void }) {
  const [shares, setShares] = useState<ShareMetadata[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewShare, setPreviewShare] = useState<ShareMetadata | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "selected" | "all" } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchShares = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/shares?page=${page}&limit=20&type=${typeFilter}`);
      if (!res.ok) return;
      const data = await res.json() as Record<string, any>;
      setShares(data.shares);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => { fetchShares(); }, [fetchShares]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === shares.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(shares.map((s) => s.id)));
    }
  };

  const handleDelete = async () => {
    if (!confirmAction) return;
    const body = confirmAction.type === "selected"
      ? { ids: Array.from(selected) }
      : {};
    await fetch("/api/admin/shares", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSelected(new Set());
    setConfirmAction(null);
    setPage(1);
    fetchShares();
    onDataChange?.();
  };

  const getSize = (s: ShareMetadata) =>
    s.fileSize || (s.content ? new Blob([s.content]).size : 0);

  return (
    <>
      {/* Type filter */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => { setTypeFilter(t); setPage(1); setSelected(new Set()); }}
            className={`px-2 py-1 text-[10px] font-[family-name:var(--font-pixel-stack)] border transition-all ${
              typeFilter === t
                ? "border-pixel-green text-pixel-green bg-pixel-green/10"
                : "border-pixel-gray/20 text-pixel-gray/50 hover:text-pixel-gray"
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
        <span className="text-pixel-gray/40 text-xs ml-auto">{total} shares</span>
      </div>

      {/* Selection toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-2 pixel-border bg-pixel-pink/5">
          <span className="text-pixel-pink text-xs font-[family-name:var(--font-pixel-stack)]">
            {selected.size} SELECTED
          </span>
          <button
            onClick={() => setConfirmAction({ type: "selected" })}
            className="px-3 py-1 border border-pixel-pink/30 text-pixel-pink text-[10px] font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-pink/10 transition-all flex items-center gap-1"
          >
            <Trash2 size={10} /> DELETE
          </button>
          <button
            onClick={() => setConfirmAction({ type: "all" })}
            className="px-3 py-1 border border-pixel-pink text-pixel-pink text-[10px] font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-pink/10 transition-all ml-auto"
          >
            CLEAR ALL
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-pixel-green/20">
              <th className="p-2 text-left w-8">
                <input
                  type="checkbox"
                  checked={shares.length > 0 && selected.size === shares.length}
                  onChange={toggleAll}
                  className="accent-pixel-green"
                />
              </th>
              <th className="p-2 text-left text-pixel-green font-[family-name:var(--font-pixel-stack)] text-[10px]">ID</th>
              <th className="p-2 text-left text-pixel-green font-[family-name:var(--font-pixel-stack)] text-[10px]">TYPE</th>
              <th className="p-2 text-left text-pixel-green font-[family-name:var(--font-pixel-stack)] text-[10px] hidden sm:table-cell">TITLE</th>
              <th className="p-2 text-left text-pixel-green font-[family-name:var(--font-pixel-stack)] text-[10px] hidden md:table-cell">DATE</th>
              <th className="p-2 text-right text-pixel-green font-[family-name:var(--font-pixel-stack)] text-[10px]">SIZE</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {shares.map((s) => (
              <tr
                key={s.id}
                className={`border-b border-pixel-green/10 hover:bg-pixel-green/5 transition-colors cursor-pointer ${
                  selected.has(s.id) ? "bg-pixel-pink/5" : ""
                }`}
                onClick={() => setPreviewShare(s)}
              >
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="accent-pixel-green"
                  />
                </td>
                <td className="p-2 text-pixel-cyan font-mono">{s.id}</td>
                <td className={`p-2 font-[family-name:var(--font-pixel-stack)] text-[10px] ${TYPE_COLORS[s.type] || "text-pixel-gray"}`}>
                  {s.type.toUpperCase()}
                </td>
                <td className="p-2 text-pixel-gray truncate max-w-[200px] hidden sm:table-cell">
                  {s.title || s.fileName || "-"}
                </td>
                <td className="p-2 text-pixel-gray hidden md:table-cell">
                  {new Date(s.createdAt).toISOString().slice(0, 10)}
                </td>
                <td className="p-2 text-pixel-gray text-right">{formatFileSize(getSize(s))}</td>
                <td className="p-2">
                  <Eye size={14} className="text-pixel-gray/40" />
                </td>
              </tr>
            ))}
            {shares.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-pixel-gray/40">
                  {loading ? "Loading..." : "No shares found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 text-pixel-green disabled:text-pixel-gray/30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-pixel-gray text-xs font-[family-name:var(--font-pixel-stack)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 text-pixel-green disabled:text-pixel-gray/30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <SharePreviewModal share={previewShare} onClose={() => setPreviewShare(null)} />
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.type === "all" ? "CLEAR ALL SHARES" : "DELETE SELECTED"}
        message={
          confirmAction?.type === "all"
            ? "This will permanently delete ALL shares and uploaded files. This cannot be undone."
            : `Delete ${selected.size} selected share(s)? This cannot be undone.`
        }
        confirmLabel="DELETE"
        confirmColor="pink"
        onConfirm={handleDelete}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}
