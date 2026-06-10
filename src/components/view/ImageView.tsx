"use client";
import { ShareMetadata } from "@/lib/types";
import { formatFileSize } from "@/lib/constants";
import { Download } from "lucide-react";
import ImageLightbox from "@/components/shared/ImageLightbox";
import { useT } from "@/lib/i18n";

export default function ImageView({ share }: { share: ShareMetadata }) {
  const t = useT();
  const imageUrl = `/api/shares/${share.id}/raw`;

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <ImageLightbox
          src={imageUrl}
          alt={share.title || share.fileName || t("view.image.alt")}
        />
      </div>
      {/* Sticky download bar */}
      <div className="sticky bottom-0 z-10 bg-pixel-darker/95 backdrop-blur-sm py-3 -mx-4 px-4 border-t border-pixel-green/20 flex items-center justify-between">
        <div className="text-base truncate mr-4">
          <span className="text-pixel-cyan">{share.fileName}</span>
          {share.fileSize && <span className="text-pixel-gray ml-2">({formatFileSize(share.fileSize)})</span>}
        </div>
        <a
          href={imageUrl}
          download={share.fileName}
          className="shrink-0 px-4 py-2 border-2 border-pixel-green/30 text-pixel-green text-sm font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-green/10 hover:border-pixel-green/50 transition-all flex items-center gap-2"
        >
          <Download size={14} />
          {t("view.image.save")}
        </a>
      </div>
    </div>
  );
}
