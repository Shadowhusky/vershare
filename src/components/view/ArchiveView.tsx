"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Folder,
  FolderOpen,
  FileIcon,
  ImageIcon,
  FileText,
  Code,
  Film,
  Download,
  Loader2,
  X,
} from "lucide-react";
import { openArchive, ArchiveEntry, ArchiveSource } from "@/lib/archive";
import { inferMimeType } from "@/lib/mime";
import { formatFileSize } from "@/lib/constants";
import { readViewParam, writeViewParams } from "@/lib/view-state";
import Lightbox from "@/components/shared/Lightbox";
import MediaPreview from "./MediaPreview";
import TextView from "./TextView";
import MarkdownView from "./MarkdownView";
import CodeView from "./CodeView";
import { useT } from "@/lib/i18n";

// No svg: SVG can carry scripts, so archive SVGs stay download-only
const IMG_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|ico)$/i;
const MD_EXT = /\.(md|markdown)$/i;
const TEXT_EXT = /\.(txt|log|csv|tsv|ini|cfg|conf|env|gitignore|license|readme)$/i;
const CODE_LANG: Record<string, string> = {
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript",
  py: "python", java: "java", c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp",
  cs: "csharp", go: "go", rs: "rust", rb: "ruby", php: "php", swift: "swift",
  kt: "kotlin", html: "html", htm: "html", css: "css", scss: "css", sql: "sql",
  sh: "bash", bash: "bash", zsh: "bash", json: "json", yml: "yaml", yaml: "yaml",
  toml: "yaml", xml: "xml",
};
const MAX_TEXT_PREVIEW = 2 * 1024 * 1024;
// getBlob materializes the whole decompressed entry — bound it
const MAX_EXTRACT = 256 * 1024 * 1024;
// DOM cost, not tree cost, dominates huge archives — cap rendered rows
const MAX_ROWS = 2000;

type Kind = "image" | "markdown" | "code" | "text" | "media" | "other";

function entryKind(name: string): { kind: Kind; language?: string; mime?: string } {
  if (IMG_EXT.test(name)) return { kind: "image" };
  if (MD_EXT.test(name)) return { kind: "markdown" };
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (CODE_LANG[ext]) return { kind: "code", language: CODE_LANG[ext] };
  if (TEXT_EXT.test(name) || /^\./.test(name)) return { kind: "text" };
  const mime = inferMimeType(name);
  if (mime.startsWith("video/") || mime.startsWith("audio/") || mime === "application/pdf") {
    return { kind: "media", mime };
  }
  return { kind: "other" };
}

function kindIcon(kind: Kind) {
  switch (kind) {
    case "image": return <ImageIcon size={14} className="text-pixel-pink" />;
    case "markdown": return <FileText size={14} className="text-pixel-purple" />;
    case "code": return <Code size={14} className="text-pixel-cyan" />;
    case "text": return <FileText size={14} className="text-pixel-gray" />;
    case "media": return <Film size={14} className="text-pixel-amber" />;
    default: return <FileIcon size={14} className="text-pixel-gray" />;
  }
}

interface TreeNode {
  path: string;
  name: string;
  depth: number;
  dir: boolean;
  size: number;
  entry?: ArchiveEntry;
}

function buildTree(entries: ArchiveEntry[]): TreeNode[] {
  // Zips may omit directory records — derive every ancestor from file paths.
  // Single O(N) pass into a parent→children index, then one DFS.
  const byParent = new Map<string, TreeNode[]>();
  const dirSet = new Set<string>();
  const push = (node: TreeNode) => {
    const idx = node.path.lastIndexOf("/");
    const parent = idx >= 0 ? node.path.slice(0, idx) : "";
    let bucket = byParent.get(parent);
    if (!bucket) byParent.set(parent, (bucket = []));
    bucket.push(node);
  };
  const ensureDir = (path: string) => {
    if (!path || dirSet.has(path)) return;
    dirSet.add(path);
    const idx = path.lastIndexOf("/");
    ensureDir(idx >= 0 ? path.slice(0, idx) : "");
    push({
      path,
      name: idx >= 0 ? path.slice(idx + 1) : path,
      depth: path.split("/").length - 1,
      dir: true,
      size: 0,
    });
  };
  for (const e of entries) {
    if (e.dir) {
      ensureDir(e.path);
    } else {
      const idx = e.path.lastIndexOf("/");
      ensureDir(idx >= 0 ? e.path.slice(0, idx) : "");
      push({ path: e.path, name: e.name, depth: e.path.split("/").length - 1, dir: false, size: e.size, entry: e });
    }
  }

  const cmp = (a: TreeNode, b: TreeNode) =>
    a.dir !== b.dir ? (a.dir ? -1 : 1) : a.name.localeCompare(b.name, undefined, { numeric: true });

  const out: TreeNode[] = [];
  const walk = (parent: string) => {
    const kids = byParent.get(parent);
    if (!kids) return;
    kids.sort(cmp);
    for (const node of kids) {
      out.push(node);
      if (node.dir) walk(node.path);
    }
  };
  walk("");
  return out;
}

type Preview =
  | { path: string; kind: "markdown" | "code" | "text"; content: string; language?: string }
  | { path: string; kind: "media"; url: string; mime: string; name: string }
  | { path: string; kind: "toolarge" | "failed" };

export default function ArchiveView({ source, archiveName }: { source: ArchiveSource; archiveName?: string }) {
  const t = useT();
  const [entries, setEntries] = useState<ArchiveEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Preview | null>(null);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [gallery, setGallery] = useState<number | null>(null);
  // Promise-cached so concurrent callers share one extraction; disposedRef
  // makes extractions that finish after unmount revoke their own URL
  const blobUrls = useRef<Map<string, Promise<string>>>(new Map());
  const disposedRef = useRef(false);
  const restoredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    openArchive(source)
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    const urls = blobUrls.current;
    return () => {
      cancelled = true;
      disposedRef.current = true;
      urls.forEach((p) => p.then((u) => URL.revokeObjectURL(u)).catch(() => {}));
      urls.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tree = useMemo(() => (entries ? buildTree(entries) : []), [entries]);
  const images = useMemo(
    () =>
      (entries || [])
        .filter((e) => !e.dir && IMG_EXT.test(e.name))
        .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true })),
    [entries]
  );
  const fileCount = useMemo(() => (entries || []).filter((e) => !e.dir).length, [entries]);
  const totalSize = useMemo(() => (entries || []).reduce((s, e) => s + (e.dir ? 0 : e.size), 0), [entries]);

  const entryUrl = useCallback(async (entry: ArchiveEntry): Promise<string> => {
    if (entry.size > MAX_EXTRACT) throw new Error("Entry too large to extract");
    const cached = blobUrls.current.get(entry.path);
    if (cached) return cached;
    const promise = entry.getBlob(inferMimeType(entry.name)).then((blob) => {
      const url = URL.createObjectURL(blob);
      if (disposedRef.current) URL.revokeObjectURL(url);
      return url;
    });
    blobUrls.current.set(entry.path, promise);
    promise.catch(() => blobUrls.current.delete(entry.path));
    return promise;
  }, []);

  const galleryItems = useMemo(
    () =>
      images.map((e) => ({
        name: e.path,
        load: () => entryUrl(e),
      })),
    [images, entryUrl]
  );

  const syncUrl = useCallback((path: string | null) => {
    writeViewParams({ p: path });
  }, []);

  const openEntry = useCallback(
    async (node: TreeNode, fromRestore = false) => {
      const entry = node.entry;
      if (!entry) return;
      const { kind, language, mime } = entryKind(node.name);

      if (kind === "image") {
        const idx = images.findIndex((e) => e.path === entry.path);
        if (idx >= 0) {
          setGallery(idx);
          if (!fromRestore) syncUrl(entry.path);
        }
        return;
      }
      if (kind === "other") {
        return;
      }

      setExtracting(entry.path);
      try {
        if (kind === "media") {
          if (entry.size > MAX_EXTRACT) {
            setPreview({ path: entry.path, kind: "toolarge" });
            if (!fromRestore) syncUrl(entry.path);
            return;
          }
          const url = await entryUrl(entry);
          setPreview({ path: entry.path, kind: "media", url, mime: mime!, name: node.name });
        } else if (entry.size > MAX_TEXT_PREVIEW) {
          setPreview({ path: entry.path, kind: "toolarge" });
        } else {
          const content = await (await entry.getBlob("text/plain")).text();
          setPreview({ path: entry.path, kind, content, language });
        }
        if (!fromRestore) syncUrl(entry.path);
      } catch {
        setPreview({ path: entry.path, kind: "failed" });
      } finally {
        setExtracting(null);
      }
    },
    [images, entryUrl, syncUrl]
  );

  // Restore ?p= once entries are ready
  useEffect(() => {
    if (!entries || restoredRef.current) return;
    restoredRef.current = true;
    const p = readViewParam("p");
    if (!p) return;
    const node = tree.find((n) => !n.dir && n.path === p);
    if (node) openEntry(node, true);
  }, [entries, tree, openEntry]);

  const downloadEntry = useCallback(
    async (entry: ArchiveEntry) => {
      setExtracting(entry.path);
      try {
        const url = await entryUrl(entry);
        const a = document.createElement("a");
        a.href = url;
        a.download = entry.name;
        a.click();
      } catch {
        // extraction failed — row stays, nothing to download
      } finally {
        setExtracting(null);
      }
    },
    [entryUrl]
  );

  const visible = useMemo(() => {
    // tree is in DFS order — a collapsed dir's subtree is one contiguous run
    const out: TreeNode[] = [];
    let skipPrefix: string | null = null;
    for (const node of tree) {
      if (skipPrefix) {
        if (node.path.startsWith(skipPrefix)) continue;
        skipPrefix = null;
      }
      out.push(node);
      if (node.dir && collapsed.has(node.path)) skipPrefix = node.path + "/";
    }
    return out;
  }, [tree, collapsed]);
  const shownRows = useMemo(() => visible.slice(0, MAX_ROWS), [visible]);

  if (error) {
    return (
      <div className="px-3 py-2 bg-pixel-pink/10 border border-pixel-pink/40 text-pixel-pink text-xs font-[family-name:var(--font-pixel-stack)] text-center leading-relaxed">
        ! {t("archive.error")}
      </div>
    );
  }

  if (!entries) {
    return (
      <div className="pixel-border p-6 bg-pixel-dark/50 flex items-center justify-center gap-3 text-pixel-gray text-sm">
        <Loader2 size={16} className="animate-spin" />
        <span className="font-[family-name:var(--font-pixel-stack)] text-xs">{t("archive.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="flex items-center justify-between gap-3 text-xs text-pixel-gray font-[family-name:var(--font-pixel-stack)]">
        <span className="min-w-0 truncate">▸ {archiveName || "ZIP"}</span>
        <span className="shrink-0 whitespace-nowrap">
          {t("archive.stats", { count: fileCount, size: formatFileSize(totalSize) })}
        </span>
      </div>

      {/* Tree */}
      <div className="pixel-border bg-pixel-dark/40 max-h-[50vh] overflow-y-auto">
        {shownRows.map((node) => {
          const { kind } = node.dir ? { kind: "other" as Kind } : entryKind(node.name);
          const isCollapsed = collapsed.has(node.path);
          const busy = extracting === node.path;
          const active = preview?.path === node.path;
          return (
            <div
              key={node.path}
              className={`flex items-center gap-2 pr-2 transition-colors ${
                active ? "bg-[var(--pixel-accent-10)]" : "hover:bg-[var(--pixel-accent-05)]"
              }`}
              style={{ paddingLeft: `${node.depth * 16 + 10}px` }}
            >
              <button
                onClick={() =>
                  node.dir
                    ? setCollapsed((s) => {
                        const next = new Set(s);
                        if (next.has(node.path)) next.delete(node.path);
                        else next.add(node.path);
                        return next;
                      })
                    : openEntry(node)
                }
                className={`flex-1 min-w-0 flex items-center gap-2 py-1.5 text-left ${
                  !node.dir && kind === "other" ? "cursor-default" : ""
                }`}
              >
                <span className="shrink-0">
                  {node.dir ? (
                    isCollapsed ? (
                      <Folder size={14} className="text-pixel-amber" />
                    ) : (
                      <FolderOpen size={14} className="text-pixel-amber" />
                    )
                  ) : (
                    kindIcon(kind)
                  )}
                </span>
                <span className={`truncate text-[13px] ${node.dir ? "text-pixel-text" : "text-pixel-cyan"}`}>
                  {node.name}
                </span>
                {!node.dir && (
                  <span className="shrink-0 text-[11px] text-pixel-gray/70 ml-auto">
                    {formatFileSize(node.size)}
                  </span>
                )}
              </button>
              {!node.dir && (
                <button
                  onClick={() => node.entry && downloadEntry(node.entry)}
                  title={t("archive.downloadEntry")}
                  aria-label={t("archive.downloadEntry")}
                  className="shrink-0 p-1 text-pixel-gray/50 hover:text-pixel-green transition-colors"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                </button>
              )}
            </div>
          );
        })}
        {visible.length > MAX_ROWS && (
          <p className="px-3 py-2 text-[11px] text-pixel-gray/70 border-t [border-color:var(--pixel-border)]">
            {t("archive.truncated", { shown: MAX_ROWS, total: visible.length })}
          </p>
        )}
      </div>

      {/* Inline preview of the selected entry */}
      {preview && (
        <div className="space-y-2 animate-content-in">
          <div className="flex items-center justify-between">
            <span className="text-xs text-pixel-gray font-[family-name:var(--font-pixel-stack)] truncate">
              ▸ {preview.path}
            </span>
            <button
              onClick={() => {
                setPreview(null);
                syncUrl(null);
              }}
              aria-label={t("archive.closePreview")}
              className="shrink-0 p-1 text-pixel-gray hover:text-pixel-pink transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          {preview.kind === "markdown" && <MarkdownView content={preview.content} />}
          {preview.kind === "code" && <CodeView content={preview.content} language={preview.language} />}
          {preview.kind === "text" && <TextView content={preview.content} />}
          {preview.kind === "media" && (
            <MediaPreview url={preview.url} mimeType={preview.mime} fileName={preview.name} />
          )}
          {preview.kind === "toolarge" && (
            <p className="text-pixel-gray text-sm">{t("archive.tooLarge")}</p>
          )}
          {preview.kind === "failed" && (
            <p className="text-pixel-pink text-sm">{t("archive.extractFailed")}</p>
          )}
        </div>
      )}

      {gallery !== null && images.length > 0 && (
        <Lightbox
          items={galleryItems}
          index={gallery}
          onIndexChange={(i) => {
            setGallery(i);
            syncUrl(images[i].path);
          }}
          onClose={() => {
            setGallery(null);
            // an inline preview may still be open underneath — keep its state
            syncUrl(preview?.path ?? null);
          }}
        />
      )}
    </div>
  );
}
