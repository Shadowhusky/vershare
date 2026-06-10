"use client";
import { useState, useEffect } from "react";
import DropZone from "@/components/shared/DropZone";
import { MAX_IMAGE_SIZE, formatFileSize } from "@/lib/constants";
import { ImageIcon, X } from "lucide-react";
import { useT } from "@/lib/i18n";

interface ImageTabProps {
  file: File | null;
  onFile: (file: File | null) => void;
}

export default function ImageTab({ file, onFile }: ImageTabProps) {
  const t = useT();
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="space-y-3">
      <label className="text-pixel-gray text-sm block">
        <span className="text-pixel-green/50">&gt;</span> {t("create.imageTab.label")}
      </label>

      {file && preview ? (
        <div className="space-y-3">
          <div className="pixel-border p-2 bg-pixel-dark/50 relative">
            <img
              src={preview}
              alt={t("create.previewAlt")}
              className="max-h-[400px] mx-auto object-contain"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-pixel-cyan" />
              <span className="text-base text-pixel-cyan">{file.name}</span>
              <span className="text-sm text-pixel-gray">
                ({formatFileSize(file.size)})
              </span>
            </div>
            <button
              type="button"
              onClick={() => onFile(null)}
              className="text-pixel-pink hover:text-pixel-pink/80 p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ) : (
        <DropZone
          onFile={onFile}
          accept="image/*"
          maxSize={MAX_IMAGE_SIZE}
          label={t("create.imageTab.dropHere")}
        />
      )}
    </div>
  );
}
