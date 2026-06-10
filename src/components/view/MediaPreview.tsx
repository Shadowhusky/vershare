"use client";
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
          className="w-full border-0 bg-white"
          style={{ height: "80vh" }}
        />
      </div>
    );
  }

  if (mimeType.startsWith("video/")) {
    return (
      <div className="content-view p-3">
        <video
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-[80vh]"
        >
          <source src={url} type={mimeType} />
          {t("view.media.videoUnsupported")}
        </video>
      </div>
    );
  }

  if (mimeType.startsWith("audio/")) {
    return (
      <div className="content-view p-4 flex items-center justify-center">
        <audio controls src={url} className="w-full" preload="metadata">
          {t("view.media.audioUnsupported")}
        </audio>
      </div>
    );
  }

  return null;
}
