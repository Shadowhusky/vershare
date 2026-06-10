"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2,
  Wifi,
  WifiOff,
  Download,
  Check,
} from "lucide-react";
import { createPeer, connectToPeer, receivePayload, P2PPayload } from "@/lib/p2p";
import RetroProgress from "@/components/shared/RetroProgress";
import TextView from "./TextView";
import MarkdownView from "./MarkdownView";
import CodeView from "./CodeView";
import ImageLightbox from "@/components/shared/ImageLightbox";
import MediaPreview, { isPreviewable } from "./MediaPreview";
import type Peer from "peerjs";
import { useT } from "@/lib/i18n";

interface P2PReceiverProps {
  peerId: string;
}

export default function P2PReceiver({ peerId }: P2PReceiverProps) {
  const t = useT();
  const [status, setStatus] = useState<
    "connecting" | "receiving" | "complete" | "error"
  >("connecting");
  const [progress, setProgress] = useState(0);
  const [hasFile, setHasFile] = useState(false);
  const [metadata, setMetadata] = useState<P2PPayload | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Throttle progress updates to animation frames so rapid chunk arrivals
  // don't get fully batched away by React
  const throttledSetProgress = useCallback((pct: number) => {
    progressRef.current = pct;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        setProgress(progressRef.current);
        rafRef.current = null;
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        const peer = await createPeer();
        if (cancelled) {
          peer.destroy();
          return;
        }
        peerRef.current = peer;

        const conn = await connectToPeer(peer, peerId);
        if (cancelled) {
          conn.close();
          return;
        }

        setStatus("receiving");

        receivePayload(
          conn,
          (payload, fileFlag) => {
            if (cancelled) return;
            setMetadata(payload);
            setHasFile(fileFlag);
            if (!fileFlag) {
              setProgress(100);
            }
          },
          (pct) => {
            if (!cancelled) throttledSetProgress(pct);
          },
          (blob) => {
            if (cancelled) return;
            if (blob) {
              setFileBlob(blob);
              setFileBlobUrl(URL.createObjectURL(blob));
            }
            setProgress(100);
            setStatus("complete");
          }
        );

        conn.on("error", (err) => {
          if (!cancelled) {
            setError(err.message);
            setStatus("error");
          }
        });

        peer.on("error", (err) => {
          if (!cancelled) {
            setError(err.message);
            setStatus("error");
          }
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("view.p2p.connectError")
          );
          setStatus("error");
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      peerRef.current?.destroy();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (fileBlobUrl) URL.revokeObjectURL(fileBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="pixel-border p-4 bg-pixel-purple/5 space-y-3">
        <div className="flex items-center gap-2">
          {status === "connecting" && (
            <>
              <Loader2 size={14} className="text-pixel-purple animate-spin" />
              <span className="font-[family-name:var(--font-pixel-stack)] text-pixel-purple text-sm">
                {t("view.p2p.connecting")}
              </span>
            </>
          )}
          {status === "receiving" && (
            <>
              <Wifi size={14} className="text-pixel-cyan" />
              <span className="font-[family-name:var(--font-pixel-stack)] text-pixel-cyan text-sm">
                {hasFile ? t("view.p2p.receivingFile") : t("view.p2p.receivingData")}
              </span>
            </>
          )}
          {status === "complete" && (
            <>
              <Check size={14} className="text-pixel-green" />
              <span className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-sm">
                {t("view.p2p.received")}
              </span>
            </>
          )}
          {status === "error" && (
            <>
              <WifiOff size={14} className="text-pixel-pink" />
              <span className="font-[family-name:var(--font-pixel-stack)] text-pixel-pink text-sm">
                {t("view.p2p.connectionFailed")}
              </span>
            </>
          )}
        </div>

        {/* Always show progress during receiving */}
        {status === "receiving" && (
          <RetroProgress
            percent={progress}
            color="cyan"
            label={hasFile ? t("view.p2p.downloading") : t("view.p2p.receiving")}
          />
        )}

        {error && (
          <p className="text-pixel-pink text-sm">
            ! {error}. {t("view.p2p.senderClosed")}
          </p>
        )}
      </div>

      {/* Content display */}
      {status === "complete" && metadata && (
        <div className="space-y-4">
          {metadata.title && (
            <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-base">
              {metadata.title}
            </h3>
          )}

          {metadata.type === "text" && metadata.content && (
            <TextView content={metadata.content} />
          )}

          {metadata.type === "markdown" && metadata.content && (
            <MarkdownView content={metadata.content} />
          )}

          {metadata.type === "code" && metadata.content && (
            <CodeView
              content={metadata.content}
              language={metadata.language}
            />
          )}

          {metadata.type === "image" && fileBlobUrl && (
            <div className="space-y-4">
              <ImageLightbox
                src={fileBlobUrl}
                alt={metadata.fileName || t("view.p2p.receivedImageAlt")}
              />
              <a
                href={fileBlobUrl}
                download={metadata.fileName || "image"}
                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-pixel-green/30 text-pixel-green text-sm font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-green/10 transition-all"
              >
                <Download size={14} />
                {t("view.p2p.saveImage")}
              </a>
            </div>
          )}

          {metadata.type === "file" && fileBlobUrl && (
            <div className="space-y-4">
              {metadata.mimeType?.startsWith("image/") && (
                <ImageLightbox
                  src={fileBlobUrl}
                  alt={metadata.fileName || t("view.p2p.receivedFileAlt")}
                />
              )}
              {metadata.mimeType && !metadata.mimeType.startsWith("image/") && isPreviewable(metadata.mimeType) && (
                <MediaPreview
                  url={fileBlobUrl}
                  mimeType={metadata.mimeType}
                  fileName={metadata.fileName}
                />
              )}
              <div className="pixel-border p-6 bg-pixel-dark/50 flex flex-col items-center gap-4">
                <div className="text-center">
                  <p className="text-pixel-cyan text-lg">
                    {metadata.fileName}
                  </p>
                  {metadata.fileSize && (
                    <p className="text-pixel-gray text-base">
                      {t("view.p2p.fileSizeMb", { size: (metadata.fileSize / (1024 * 1024)).toFixed(1) })}
                    </p>
                  )}
                </div>
                <a
                  href={fileBlobUrl}
                  download={metadata.fileName || "file"}
                  className="px-6 py-3 border-2 border-pixel-green text-pixel-green font-[family-name:var(--font-pixel-stack)] text-sm hover:bg-pixel-green/10 transition-all flex items-center gap-2"
                >
                  <Download size={16} />
                  {t("view.file.download")}
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
