"use client";
import { X } from "lucide-react";
import { ShareMetadata } from "@/lib/types";
import TextView from "@/components/view/TextView";
import MarkdownView from "@/components/view/MarkdownView";
import CodeView from "@/components/view/CodeView";
import ImageLightbox from "@/components/shared/ImageLightbox";
import MediaPreview, { isPreviewable } from "@/components/view/MediaPreview";
import { formatFileSize } from "@/lib/constants";
import { useEffect, useCallback } from "react";

interface SharePreviewModalProps {
  share: ShareMetadata | null;
  onClose: () => void;
}

export default function SharePreviewModal({ share, onClose }: SharePreviewModalProps) {
  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!share) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [share, close]);

  if (!share) return null;

  const rawUrl = `/api/shares/${share.id}/raw`;
  const isImage = share.mimeType?.startsWith("image/") ?? false;
  const hasMedia = !isImage && isPreviewable(share.mimeType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={close}>
      <div
        className="pixel-border bg-pixel-darker max-w-4xl w-full max-h-[90vh] overflow-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs text-glow mb-1">
              {share.title || share.fileName || share.id}
            </h3>
            <div className="flex items-center gap-2 text-pixel-gray text-xs">
              <span className="text-pixel-amber">{share.type.toUpperCase()}</span>
              <span>·</span>
              <span>{share.id}</span>
              {share.fileSize && (
                <>
                  <span>·</span>
                  <span>{formatFileSize(share.fileSize)}</span>
                </>
              )}
            </div>
          </div>
          <button onClick={close} className="text-pixel-gray hover:text-pixel-pink p-1 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {share.type === "text" && share.content && <TextView content={share.content} />}
        {share.type === "markdown" && share.content && <MarkdownView content={share.content} />}
        {share.type === "code" && share.content && <CodeView content={share.content} language={share.language} />}
        {share.type === "image" && (
          <div className="flex justify-center">
            <ImageLightbox src={rawUrl} alt={share.fileName || "Image"} />
          </div>
        )}
        {share.type === "file" && isImage && (
          <div className="flex justify-center">
            <ImageLightbox src={rawUrl} alt={share.fileName || "Image"} />
          </div>
        )}
        {share.type === "file" && hasMedia && (
          <MediaPreview url={rawUrl} mimeType={share.mimeType!} fileName={share.fileName} />
        )}
        {share.type === "file" && !isImage && !hasMedia && (
          <div className="pixel-border p-6 bg-pixel-dark/50 text-center">
            <p className="text-pixel-gray text-sm">File preview not available</p>
            <a
              href={rawUrl}
              download={share.fileName}
              className="inline-block mt-3 px-4 py-2 border border-pixel-green/30 text-pixel-green text-xs font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-green/10 transition-all"
            >
              DOWNLOAD
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
