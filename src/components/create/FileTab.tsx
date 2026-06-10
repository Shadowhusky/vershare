"use client";
import { useState, useEffect } from "react";
import DropZone from "@/components/shared/DropZone";
import { MAX_FILE_SIZE, formatFileSize } from "@/lib/constants";
import { FileIcon, X } from "lucide-react";
import { useT } from "@/lib/i18n";

interface FileTabProps {
  file: File | null;
  onFile: (file: File | null) => void;
}

export default function FileTab({ file, onFile }: FileTabProps) {
  const t = useT();
  const [preview, setPreview] = useState<string | null>(null);
  const isImage = file?.type.startsWith("image/") ?? false;

  useEffect(() => {
    if (!file || !isImage) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className="space-y-3">
      <label className="text-pixel-gray text-sm block">
        <span className="text-pixel-green/50">&gt;</span> {t("create.fileTab.label")}
      </label>

      {file ? (
        <div className="space-y-3">
          {isImage && preview && (
            <div className="pixel-border p-2 bg-pixel-dark/50">
              <img
                src={preview}
                alt={t("create.previewAlt")}
                className="max-h-[300px] mx-auto object-contain"
              />
            </div>
          )}
          <div className="pixel-border p-4 flex items-center justify-between bg-pixel-dark/50">
            <div className="flex items-center gap-3">
              <FileIcon size={24} className="text-pixel-cyan" />
              <div>
                <p className="text-base text-pixel-cyan">{file.name}</p>
                <p className="text-sm text-pixel-gray">
                  {formatFileSize(file.size)}
                </p>
              </div>
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
          maxSize={MAX_FILE_SIZE}
          label={t("create.fileTab.dropHere")}
        />
      )}
    </div>
  );
}
