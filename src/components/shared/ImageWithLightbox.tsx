"use client";
import { useEffect, useState } from "react";
import Lightbox from "./Lightbox";
import { readViewParam, writeViewParams } from "@/lib/view-state";

interface ImageWithLightboxProps {
  src: string;
  alt: string;
  // Relative share URL that reopens this image fullscreen (e.g. /s/abc?fs=1)
  shareUrl?: string;
}

export default function ImageWithLightbox({ src, alt, shareUrl }: ImageWithLightboxProps) {
  const [open, setOpen] = useState(false);

  // Restore fullscreen state from a shared URL (?fs=1)
  useEffect(() => {
    if (readViewParam("fs") === "1") setOpen(true);
  }, []);

  const setOpenSynced = (next: boolean) => {
    setOpen(next);
    writeViewParams({ fs: next ? "1" : null });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenSynced(true)}
        className="pixel-border p-2 bg-pixel-dark/50 cursor-zoom-in hover:border-pixel-cyan/50 transition-all"
        style={{ display: "inline-block", maxWidth: 304 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          style={{ maxHeight: 200, maxWidth: 300, objectFit: "contain", display: "block" }}
        />
      </button>

      {open && (
        <Lightbox
          items={[{ name: alt, src }]}
          index={0}
          getShareUrl={shareUrl ? () => window.location.origin + shareUrl : undefined}
          onIndexChange={() => {}}
          onClose={() => setOpenSynced(false)}
        />
      )}
    </>
  );
}
