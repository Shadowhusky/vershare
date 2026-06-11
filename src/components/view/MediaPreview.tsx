"use client";
import { useEffect, useRef, useState } from "react";
import { Download, MonitorX } from "lucide-react";
import { useT } from "@/lib/i18n";

const PREVIEWABLE_PREFIXES = ["video/", "audio/"];
const PREVIEWABLE_EXACT = [
  "application/pdf",
  "text/html",
];

export function isPreviewable(mimeType?: string): boolean {
  if (!mimeType) return false;
  if (mimeType.startsWith("image/")) return true;
  if (PREVIEWABLE_PREFIXES.some((p) => mimeType.startsWith(p))) return true;
  if (PREVIEWABLE_EXACT.includes(mimeType)) return true;
  return false;
}

export function isInlineable(mimeType?: string): boolean {
  if (!mimeType) return false;
  if (mimeType.startsWith("image/")) return true;
  if (mimeType.startsWith("video/")) return true;
  if (mimeType.startsWith("audio/")) return true;
  if (mimeType === "application/pdf") return true;
  if (mimeType === "text/html") return true;
  return false;
}

interface MediaPreviewProps {
  url: string;
  mimeType: string;
  fileName?: string;
}

export default function MediaPreview({ url, mimeType, fileName }: MediaPreviewProps) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);

  // SSR'd media can fail before hydration attaches onError — check on mount
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.error) setFailed(true);
    else if (el.readyState >= 1 && "videoWidth" in el && el.videoWidth === 0 && mimeType.startsWith("video/")) {
      setFailed(true);
    }
  }, [mimeType]);

  if (mimeType === "application/pdf") {
    return (
      <div className="content-view" style={{ padding: 0 }}>
        <iframe
          src={url}
          title={fileName || t("view.media.pdfPreview")}
          className="w-full border-0"
          style={{ height: "80vh" }}
        />
      </div>
    );
  }

  if (mimeType === "text/html") {
    return (
      <div className="content-view" style={{ padding: 0 }}>
        <iframe
          src={url}
          sandbox="allow-same-origin"
          title={fileName || t("view.media.htmlPreview")}
          className="w-full border-0 bg-pixel-dark"
          style={{ height: "80vh" }}
        />
      </div>
    );
  }

  // No <source type=…> gating: browsers skip sources whose MIME they don't
  // recognise (e.g. video/x-matroska) without trying, yet often CAN play the
  // codecs inside. A bare src makes the browser sniff the container for real.
  if (mimeType.startsWith("video/")) {
    if (failed) return <UnplayableTip url={url} fileName={fileName} />;
    return (
      <div className="content-view p-3">
        <video
          ref={mediaRef}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          className="w-full max-h-[80vh] bg-black object-contain"
          src={url}
          onError={() => setFailed(true)}
          onLoadedMetadata={(e) => {
            // metadata without dimensions = video track the browser can't decode
            if (e.currentTarget.videoWidth === 0) setFailed(true);
          }}
        />
      </div>
    );
  }

  if (mimeType.startsWith("audio/")) {
    if (failed) return <UnplayableTip url={url} fileName={fileName} />;
    return (
      <div className="content-view p-4 flex items-center justify-center">
        <audio
          ref={mediaRef}
          controls
          src={url}
          className="w-full"
          preload="metadata"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return null;
}

function UnplayableTip({ url, fileName }: { url: string; fileName?: string }) {
  const t = useT();
  return (
    <div className="content-view p-6 text-center space-y-3">
      <MonitorX size={28} className="mx-auto text-pixel-amber" />
      <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-amber text-xs">
        {t("view.media.cantPlay.title")}
      </p>
      <p className="text-pixel-gray text-sm max-w-md mx-auto leading-relaxed">
        {t("view.media.cantPlay.body")}
      </p>
      <a
        href={url}
        download={fileName}
        className="inline-flex items-center gap-2 px-4 py-2 border-2 border-pixel-green text-pixel-green text-xs font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-green/10 transition-all"
      >
        <Download size={12} />
        {t("view.media.download")}
      </a>
    </div>
  );
}
