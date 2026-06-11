"use client";
import { FileIcon } from "lucide-react";
import TextView from "@/components/view/TextView";
import MarkdownView from "@/components/view/MarkdownView";
import CodeView from "@/components/view/CodeView";
import MediaPreview, { isPreviewable } from "@/components/view/MediaPreview";
import ImageLightbox from "@/components/shared/ImageLightbox";
import { ShareType } from "@/lib/types";
import { useT } from "@/lib/i18n";

export interface LastShared {
  type: ShareType;
  content?: string;
  language?: string;
  fileName?: string;
  mime?: string;
  objectUrl?: string;
}

export default function SharedPreview({ shared }: { shared: LastShared }) {
  const t = useT();

  let body: React.ReactNode = null;
  if (shared.content !== undefined) {
    if (shared.type === "markdown") body = <MarkdownView content={shared.content} />;
    else if (shared.type === "code") body = <CodeView content={shared.content} language={shared.language} />;
    else body = <TextView content={shared.content} />;
  } else if (shared.objectUrl) {
    if (shared.mime?.startsWith("image/")) {
      body = (
        <div className="pixel-border p-2 bg-pixel-dark/50">
          <ImageLightbox src={shared.objectUrl} alt={shared.fileName || ""} />
        </div>
      );
    } else if (isPreviewable(shared.mime)) {
      body = <MediaPreview url={shared.objectUrl} mimeType={shared.mime!} fileName={shared.fileName} />;
    } else {
      body = (
        <div className="pixel-border p-4 flex items-center gap-3 bg-pixel-dark/50">
          <FileIcon size={20} className="text-pixel-cyan shrink-0" />
          <span className="text-sm text-pixel-cyan truncate">{shared.fileName}</span>
        </div>
      );
    }
  }

  if (!body) return null;

  // Cap the preview so the success view (link box + preview + NEW DROP)
  // fits in one viewport; long text scrolls inside instead of the page.
  return (
    <div className="space-y-2">
      <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-gray text-xs">
        ▸ {t("create.preview.label")}
      </p>
      <div className="[&_.content-view]:max-h-[40vh] [&_.content-view]:overflow-y-auto [&_video]:max-h-[36vh] [&_iframe]:h-[36vh]! [&_img]:max-h-[34vh] [&_img]:w-auto [&_img]:mx-auto">
        {body}
      </div>
    </div>
  );
}
