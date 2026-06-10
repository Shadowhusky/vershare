"use client";
import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const LINE_HEIGHT = 24;
const MAX_HEIGHT_VH = 80;

export default function TextView({ content }: { content: string }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => content.split("\n"), [content]);

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => LINE_HEIGHT,
    overscan: 20,
  });

  const maxH = typeof window !== "undefined"
    ? Math.min(lines.length * LINE_HEIGHT + 40, window.innerHeight * MAX_HEIGHT_VH / 100)
    : 600;

  return (
    <div
      ref={parentRef}
      className="content-view"
      style={{ maxHeight: maxH, overflow: "auto", padding: 0 }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
          padding: "20px 20px 20px 60px",
          boxSizing: "border-box",
        }}
      >
        {virtualizer.getVirtualItems().map((vRow) => (
          <div
            key={vRow.index}
            style={{
              position: "absolute",
              top: vRow.start + 20,
              left: 0,
              width: "100%",
              height: LINE_HEIGHT,
              display: "flex",
            }}
          >
            <span
              className="select-none text-neutral-600 text-right"
              style={{ width: 48, paddingRight: 12, fontSize: "0.8rem", lineHeight: `${LINE_HEIGHT}px` }}
            >
              {vRow.index + 1}
            </span>
            <pre
              className="whitespace-pre-wrap break-words"
              style={{ flex: 1, margin: 0, fontSize: "0.875rem", lineHeight: `${LINE_HEIGHT}px`, paddingRight: 20 }}
            >
              {lines[vRow.index]}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
