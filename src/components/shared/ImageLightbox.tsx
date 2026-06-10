"use client";
import { useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
}

export default function ImageLightbox({ src, alt }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pixel-border p-2 bg-pixel-dark/50 cursor-pointer hover:border-pixel-cyan/50 transition-all"
        style={{ display: "inline-block", maxWidth: 304 }}
      >
        <img
          src={src}
          alt={alt}
          style={{ maxHeight: 200, maxWidth: 300, objectFit: "contain", imageRendering: "auto", display: "block" }}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 text-pixel-gray hover:text-pixel-pink transition-colors p-2"
          >
            <X size={24} />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            style={{ imageRendering: "auto" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
