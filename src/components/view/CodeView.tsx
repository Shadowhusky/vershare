"use client";
import { useRef, useMemo, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import hljs from "@/lib/hljs";

interface CodeViewProps {
  content: string;
  language?: string;
}

const LINE_HEIGHT = 22;
const MAX_HEIGHT_VH = 80;

export default function CodeView({ content, language }: CodeViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [highlightedLines, setHighlightedLines] = useState<string[]>([]);

  const rawLines = useMemo(() => content.split("\n"), [content]);

  useEffect(() => {
    try {
      const result = language && language !== "plaintext"
        ? hljs.highlight(content, { language })
        : hljs.highlightAuto(content);
      // Split highlighted HTML by newline — each line is a self-contained fragment
      setHighlightedLines(result.value.split("\n"));
    } catch {
      setHighlightedLines(rawLines);
    }
  }, [content, language, rawLines]);

  const lines = highlightedLines.length > 0 ? highlightedLines : rawLines;

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => LINE_HEIGHT,
    overscan: 30,
  });

  const maxH = typeof window !== "undefined"
    ? Math.min(lines.length * LINE_HEIGHT + 40, window.innerHeight * MAX_HEIGHT_VH / 100)
    : 600;

  return (
    <div className="content-view relative" style={{ maxHeight: maxH, overflow: "auto", padding: 0 }} ref={parentRef}>
      {language && language !== "plaintext" && (
        <span className="sticky top-0 float-right text-sm text-neutral-500 select-none z-10 px-3 py-2">
          {language}
        </span>
      )}
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((vRow) => (
          <div
            key={vRow.index}
            style={{
              position: "absolute",
              top: vRow.start,
              left: 0,
              width: "100%",
              height: LINE_HEIGHT,
              display: "flex",
              paddingLeft: 8,
              paddingRight: 16,
            }}
          >
            <span
              className="select-none text-neutral-600 text-right shrink-0"
              style={{ width: 44, paddingRight: 12, fontSize: "0.75rem", lineHeight: `${LINE_HEIGHT}px` }}
            >
              {vRow.index + 1}
            </span>
            <code
              className="hljs"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                padding: 0,
                margin: 0,
                fontSize: "0.85rem",
                lineHeight: `${LINE_HEIGHT}px`,
                whiteSpace: "pre",
                overflow: "visible",
              }}
              dangerouslySetInnerHTML={{ __html: lines[vRow.index] || "&nbsp;" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
