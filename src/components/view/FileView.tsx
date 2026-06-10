"use client";
import { ShareMetadata } from "@/lib/types";
import { formatFileSize } from "@/lib/constants";
import { FileIcon, Download } from "lucide-react";
import ImageLightbox from "@/components/shared/ImageLightbox";
import MediaPreview, { isPreviewable } from "./MediaPreview";
import { useT } from "@/lib/i18n";

export default function FileView({ share }: { share: ShareMetadata }) {
  const t = useT();
  const isImage = share.mimeType?.startsWith("image/") ?? false;
  const hasMediaPreview = !isImage && isPreviewable(share.mimeType);
  const rawUrl = `/api/shares/${share.id}/raw`;

  return (
    <div className="space-y-4">
      {isImage && (
        <div className="flex justify-center">
          <ImageLightbox src={rawUrl} alt={share.fileName || t("view.file.previewAlt")} />
        </div>
      )}
      {hasMediaPreview && (
        <MediaPreview url={rawUrl} mimeType={share.mimeType!} fileName={share.fileName} />
      )}
      {!isImage && !hasMediaPreview && (
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
          className="shrink-0 px-6 py-3 border-2 border-pixel-green text-pixel-green font-[family-name:var(--font-pixel-stack)] text-sm hover:bg-pixel-green/10 transition-all flex items-center gap-2"
        >
          <Download size={16} />
          {t("view.file.download")}
        </a>
      </div>
    </div>
  );
}
