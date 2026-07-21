"use client";
import { useEffect, useState } from "react";
import { ShareMetadata } from "@/lib/types";
import { formatFileSize } from "@/lib/constants";
import { FileIcon, Download, Loader2 } from "lucide-react";
import ImageWithLightbox from "@/components/shared/ImageWithLightbox";
import MediaPreview, { isPreviewable } from "./MediaPreview";
import ArchiveView from "./ArchiveView";
import TextView from "./TextView";
import MarkdownView from "./MarkdownView";
import CodeView from "./CodeView";
import { isArchive } from "@/lib/archive";
import { detectPreviewKind, MAX_TEXT_PREVIEW } from "@/lib/preview-kind";
import { useT } from "@/lib/i18n";
import posthog from "posthog-js";

export default function FileView({ share }: { share: ShareMetadata }) {
  const t = useT();
  const isImage = share.mimeType?.startsWith("image/") ?? false;
  const isZip = !isImage && isArchive(share.mimeType, share.fileName);
  const hasMediaPreview = !isImage && !isZip && isPreviewable(share.mimeType);
  const rawUrl = `/api/shares/${share.id}/raw`;

  // Shared text-ish files (md/code/plain) preview inline like archive entries
  const kindInfo = detectPreviewKind(share.fileName || "");
  const isText =
    !isImage &&
    !isZip &&
    !hasMediaPreview &&
    (kindInfo.kind === "markdown" || kindInfo.kind === "code" || kindInfo.kind === "text") &&
    (share.fileSize ?? 0) <= MAX_TEXT_PREVIEW;
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textFailed, setTextFailed] = useState(false);

  useEffect(() => {
    if (!isText) return;
    let cancelled = false;
    fetch(rawUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => {
        if (!cancelled) setTextContent(text);
      })
      .catch(() => {
        if (!cancelled) setTextFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isText, rawUrl]);

  return (
    <div className="space-y-4">
      {isImage && (
        <div className="flex justify-center">
          <ImageWithLightbox
            src={rawUrl}
            alt={share.fileName || t("view.file.previewAlt")}
            shareUrl={`/s/${share.id}?fs=1`}
          />
        </div>
      )}
      {isZip && <ArchiveView source={{ url: rawUrl }} archiveName={share.fileName} shareId={share.id} />}
      {hasMediaPreview && (
        <MediaPreview url={rawUrl} mimeType={share.mimeType!} fileName={share.fileName} />
      )}
      {isText && textContent === null && !textFailed && (
        <div className="pixel-border p-6 bg-pixel-dark/50 flex items-center justify-center gap-3 text-pixel-gray">
          <Loader2 size={16} className="animate-spin" />
        </div>
      )}
      {isText && textContent !== null && (
        <>
          {kindInfo.kind === "markdown" && <MarkdownView content={textContent} />}
          {kindInfo.kind === "code" && <CodeView content={textContent} language={kindInfo.language} />}
          {kindInfo.kind === "text" && <TextView content={textContent} />}
        </>
      )}
      {((!isImage && !isZip && !hasMediaPreview && !isText) || textFailed) && (
        <div className="pixel-border p-6 bg-pixel-dark/50 flex flex-col items-center gap-4">
          <FileIcon size={48} className="text-pixel-cyan" />
          <div className="text-center">
            <p className="text-pixel-cyan text-lg mb-1">{share.fileName}</p>
            <p className="text-pixel-gray text-base">
              {share.fileSize ? formatFileSize(share.fileSize) : t("view.file.unknownSize")}
              {share.mimeType && <span className="text-pixel-gray/50"> · {share.mimeType}</span>}
            </p>
          </div>
        </div>
      )}
      {/* Sticky download bar */}
      <div className="sticky bottom-0 z-10 bg-pixel-darker/95 backdrop-blur-sm py-3 -mx-4 px-4 border-t border-pixel-green/20 flex items-center justify-between">
        <div className="text-base truncate mr-4">
          <span className="text-pixel-cyan">{share.fileName}</span>
          {share.fileSize && <span className="text-pixel-gray ml-2">({formatFileSize(share.fileSize)})</span>}
        </div>
        <a
          href={rawUrl}
          download={share.fileName}
          onClick={() => posthog.capture("file_downloaded", {
            share_id: share.id,
            file_name: share.fileName,
            file_size: share.fileSize,
            mime_type: share.mimeType,
          })}
          className="shrink-0 px-6 py-3 border-2 border-pixel-green text-pixel-green font-[family-name:var(--font-pixel-stack)] text-sm hover:bg-pixel-green/10 transition-all flex items-center gap-2"
        >
          <Download size={16} />
          {t("view.file.download")}
        </a>
      </div>
    </div>
  );
}
