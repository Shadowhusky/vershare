"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Wifi,
  WifiOff,
  Loader2,
  Check,
  Copy,
  Users,
  Send,
} from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import { createPeer, sendPayload, P2PPayload } from "@/lib/p2p";
import RetroProgress from "@/components/shared/RetroProgress";
import { useT } from "@/lib/i18n";
import type Peer from "peerjs";
import type { DataConnection } from "peerjs";

interface P2PSharePanelProps {
  type: "text" | "markdown" | "code" | "file" | "image";
  content?: string;
  language?: string;
  title?: string;
  file?: File | null;
}

export default function P2PSharePanel({
  type,
  content,
  language,
  title,
  file,
}: P2PSharePanelProps) {
  const t = useT();
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "preparing" | "waiting" | "sending" | "sent" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [connectedPeers, setConnectedPeers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const fileBufferRef = useRef<ArrayBuffer | null>(null);
  const payloadRef = useRef<P2PPayload | null>(null);
  const { copied, copy } = useClipboard();

  const startSharing = useCallback(async () => {
    try {
      setStatus("preparing");
      setError(null);

      // Eagerly read file into memory BEFORE setting up peer
      let fileBuffer: ArrayBuffer | null = null;
      if (file && (type === "file" || type === "image")) {
        fileBuffer = await file.arrayBuffer();
      }
      fileBufferRef.current = fileBuffer;

      // Snapshot the payload now
      payloadRef.current = {
        type,
        title: title || undefined,
        content: content || undefined,
        language,
        fileName: file?.name,
        fileSize: file?.size,
        mimeType: file?.type,
      };

      const p = await createPeer();
      setPeer(p);
      setPeerId(p.id);
      setStatus("waiting");

      p.on("connection", (conn) => {
        connectionsRef.current.push(conn);
        setConnectedPeers((n) => n + 1);

        conn.on("open", async () => {
          setStatus("sending");
          setProgress(0);

          try {
            await sendPayload(
              conn,
              payloadRef.current!,
              fileBufferRef.current || undefined,
              setProgress
            );
            setStatus("sent");
          } catch (err) {
            setError(err instanceof Error ? err.message : t("create.p2p.sendFailed"));
            setStatus("error");
          }
        });

        conn.on("close", () => {
          connectionsRef.current = connectionsRef.current.filter(
            (c) => c !== conn
          );
          setConnectedPeers((n) => Math.max(0, n - 1));
        });

        conn.on("error", (err) => {
          setError(err.message);
          setStatus("error");
        });
      });

      p.on("error", (err) => {
        const msg = err.message || String(err);
        const hint = msg.toLowerCase().includes("negotiation")
          ? t("create.p2p.natHint", { message: msg })
          : msg;
        setError(hint);
        setStatus("error");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("create.p2p.startFailed"));
      setStatus("error");
    }
  }, [type, content, language, title, file, t]);

  useEffect(() => {
    return () => {
      connectionsRef.current.forEach((c) => c.close());
      peer?.destroy();
    };
  }, [peer]);

  const shareUrl =
    typeof window !== "undefined" && peerId
      ? `${window.location.origin}/p/${peerId}`
      : "";

  if (status === "idle") {
    return (
      <button
        onClick={startSharing}
        className="w-full py-4 border-2 border-pixel-purple text-pixel-purple font-[family-name:var(--font-pixel-stack)] text-sm hover:bg-pixel-purple/10 transition-all flex items-center justify-center gap-3"
      >
        <Wifi size={16} />
        {t("create.p2p.button")}
      </button>
    );
  }

  return (
    <div className="pixel-border p-4 bg-pixel-purple/5 space-y-4">
      <div className="flex items-center gap-2">
        {status === "preparing" && (
          <>
            <Loader2 size={14} className="text-pixel-purple animate-spin" />
            <span className="font-[family-name:var(--font-pixel-stack)] text-pixel-purple text-sm">
              {t("create.p2p.preparing")}
            </span>
          </>
        )}
        {status === "waiting" && (
          <>
            <Loader2 size={14} className="text-pixel-purple animate-spin" />
            <span className="font-[family-name:var(--font-pixel-stack)] text-pixel-purple text-sm">
              {t("create.p2p.waiting")}
            </span>
          </>
        )}
        {status === "sending" && (
          <>
            <Send size={14} className="text-pixel-amber" />
            <span className="font-[family-name:var(--font-pixel-stack)] text-pixel-amber text-sm">
              {t("create.p2p.sending")}
            </span>
          </>
        )}
        {status === "sent" && (
          <>
            <Check size={14} className="text-pixel-green" />
            <span className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-sm">
              {t("create.p2p.complete")}
            </span>
          </>
        )}
        {status === "error" && (
          <>
            <WifiOff size={14} className="text-pixel-pink" />
            <span className="font-[family-name:var(--font-pixel-stack)] text-pixel-pink text-sm">
              {t("create.p2p.error")}
            </span>
          </>
        )}
      </div>

      {/* Retro progress bar */}
      {status === "sending" && (
        <RetroProgress percent={progress} color="amber" label={t("create.p2p.uploading")} />
      )}

      {/* Share link */}
      {peerId && status !== "error" && (
        <div className="flex gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="pixel-input flex-1 text-base text-pixel-purple"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => copy(shareUrl)}
            className={`px-3 py-2 border text-sm font-[family-name:var(--font-pixel-stack)] transition-all ${
              copied
                ? "border-pixel-green text-pixel-green"
                : "border-pixel-purple/30 text-pixel-purple hover:bg-pixel-purple/10"
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}

      {connectedPeers > 0 && (
        <p className="text-pixel-gray text-sm">
          <Users size={12} className="inline mr-1" />
          {connectedPeers === 1
            ? t("create.p2p.peersConnected.one")
            : t("create.p2p.peersConnected.many", { count: connectedPeers })}
        </p>
      )}

      {error && <p className="text-pixel-pink text-sm">! {error}</p>}

      <p className="text-pixel-gray/50 text-sm">
        {t("create.p2p.keepOpen")}
      </p>
    </div>
  );
}
