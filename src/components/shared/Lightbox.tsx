"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, Link2, Check } from "lucide-react";
import { useT } from "@/lib/i18n";

export interface LightboxItem {
  name: string;
  src?: string;
  // Lazy source (e.g. extract from an archive) — resolved once, cached
  load?: () => Promise<string>;
}

interface LightboxProps {
  items: LightboxItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  // When provided, the top bar offers copying a link that reopens this view
  getShareUrl?: (index: number) => string;
}

const SWIPE_COMMIT_PX = 70;
const SWIPE_CLOSE_PX = 90;

export default function Lightbox({ items, index, onIndexChange, onClose, getShareUrl }: LightboxProps) {
  const t = useT();
  const [srcMap, setSrcMap] = useState<Record<number, string>>({});
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [entered, setEntered] = useState(false);
  const pointerRef = useRef<{ id: number; startX: number; startY: number; panX: number; panY: number } | null>(null);
  const loadingRef = useRef<Set<number>>(new Set());

  const count = items.length;
  const src = srcMap[index];

  const resolve = useCallback(
    (i: number) => {
      if (i < 0 || i >= count) return;
      const item = items[i];
      if (!item || srcMap[i] || loadingRef.current.has(i)) return;
      if (item.src) {
        setSrcMap((m) => (m[i] ? m : { ...m, [i]: item.src! }));
        return;
      }
      if (!item.load) return;
      loadingRef.current.add(i);
      // blob URLs stay owned by the load() provider — no revocation here
      item
        .load()
        .then((url) => setSrcMap((m) => ({ ...m, [i]: url })))
        .catch(() => setFailed((f) => ({ ...f, [i]: true })))
        .finally(() => loadingRef.current.delete(i));
    },
    [items, srcMap, count]
  );

  // Current + wrapped neighbors, so swiping lands on an already-loaded image
  useEffect(() => {
    resolve(index);
    if (count > 1) {
      resolve((index + 1) % count);
      resolve((index - 1 + count) % count);
    }
  }, [index, count, resolve]);

  // Entrance fade + scroll lock
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      // wrap around — arrows stay put and never dead-end
      const next = (index + delta + count) % count;
      setZoom(false);
      setPan({ x: 0, y: 0 });
      onIndexChange(next);
    },
    [index, count, onIndexChange]
  );

  const [linkCopied, setLinkCopied] = useState(false);
  const copyLink = useCallback(() => {
    if (!getShareUrl) return;
    navigator.clipboard
      ?.writeText(getShareUrl(index))
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 1500);
      })
      .catch(() => {});
  }, [getShareUrl, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  const movedRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (pointerRef.current) {
      // second finger = pinch, not a swipe — abort without committing
      pointerRef.current = null;
      setDrag(null);
      return;
    }
    movedRef.current = false;
    pointerRef.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) movedRef.current = true;
    if (zoom) {
      setPan({ x: p.panX + dx, y: p.panY + dy });
    } else {
      setDrag({ x: dx, y: dy });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId) return;
    pointerRef.current = null;
    if (zoom) return;
    const d = drag;
    setDrag(null);
    if (!d) return;
    if (Math.abs(d.y) > Math.abs(d.x) && d.y > SWIPE_CLOSE_PX) {
      onClose();
    } else if (Math.abs(d.x) > SWIPE_COMMIT_PX) {
      go(d.x < 0 ? 1 : -1);
    }
  };

  // Cancelled gestures (notification shade, rotation) must not commit
  const onPointerCancel = (e: React.PointerEvent) => {
    if (pointerRef.current?.id !== e.pointerId) return;
    pointerRef.current = null;
    setDrag(null);
  };

  const toggleZoom = () => {
    setZoom((z) => !z);
    setPan({ x: 0, y: 0 });
  };

  const dragX = drag?.x ?? 0;
  const dragY = drag && Math.abs(drag.y) > Math.abs(drag.x) && drag.y > 0 ? drag.y : 0;
  const transform = zoom
    ? `translate(${pan.x}px, ${pan.y}px) scale(2.5)`
    : `translate(${dragX}px, ${dragY}px)`;
  const backdropDim = dragY > 0 ? Math.max(0.4, 0.92 - dragY / 500) : 0.92;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center touch-none transition-opacity duration-150 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: `rgba(0,0,0,${backdropDim})` }}
      role="dialog"
      aria-modal="true"
      aria-label={items[index]?.name}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-white/80 text-sm truncate mr-3">{items[index]?.name}</span>
        <div className="flex items-center gap-4 shrink-0">
          {count > 1 && (
            <span className="text-white/60 text-xs font-[family-name:var(--font-pixel-stack)]">
              {index + 1} / {count}
            </span>
          )}
          {getShareUrl && (
            <button
              onClick={copyLink}
              aria-label={t("lightbox.copyLink")}
              title={t("lightbox.copyLink")}
              className={`transition-colors p-1 ${linkCopied ? "text-pixel-green" : "text-white/80 hover:text-white"}`}
            >
              {linkCopied ? <Check size={20} /> : <Link2 size={20} />}
            </button>
          )}
          <button
            onClick={onClose}
            aria-label={t("lightbox.close")}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        className="w-full h-full flex items-center justify-center touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={(e) => {
          e.stopPropagation();
          // tap on the empty stage (not the image, not a swipe release) closes
          if (e.target === e.currentTarget && !movedRef.current) onClose();
        }}
        onDoubleClick={toggleZoom}
      >
        {failed[index] ? (
          <p className="text-pixel-pink text-sm font-[family-name:var(--font-pixel-stack)]">
            {t("lightbox.loadFailed")}
          </p>
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={items[index]?.name || ""}
            draggable={false}
            className={`max-w-[100vw] max-h-[100dvh] object-contain ${
              drag || zoom ? "" : "transition-transform duration-200 ease-out"
            } ${zoom ? "cursor-zoom-out" : count > 1 ? "cursor-grab" : "cursor-zoom-in"}`}
            style={{ transform }}
          />
        ) : (
          <Loader2 size={28} className="animate-spin text-white/60" />
        )}
      </div>

      {/* Arrows — always visible in galleries; navigation wraps around */}
      {count > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label={t("lightbox.prev")}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft size={30} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label={t("lightbox.next")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight size={30} />
          </button>
        </>
      )}
    </div>
  );
}
