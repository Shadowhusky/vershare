"use client";

interface RetroProgressProps {
  percent: number;
  color?: "green" | "amber" | "cyan" | "purple";
  label?: string;
}

const COLORS = {
  green: { bar: "bg-pixel-green", border: "border-pixel-green/30", text: "text-pixel-green", shadow: "shadow-[0_0_8px_var(--pixel-accent-25)]" },
  amber: { bar: "bg-pixel-amber", border: "border-pixel-amber/30", text: "text-pixel-amber", shadow: "shadow-[0_0_8px_rgba(255,176,0,0.3)]" },
  cyan: { bar: "bg-pixel-cyan", border: "border-pixel-cyan/30", text: "text-pixel-cyan", shadow: "shadow-[0_0_8px_rgba(0,212,255,0.3)]" },
  purple: { bar: "bg-pixel-purple", border: "border-pixel-purple/30", text: "text-pixel-purple", shadow: "shadow-[0_0_8px_rgba(176,0,255,0.3)]" },
};

export default function RetroProgress({
  percent,
  color = "green",
  label,
}: RetroProgressProps) {
  const c = COLORS[color];
  const blocks = 20;
  const filled = Math.round((percent / 100) * blocks);
  const bar = "█".repeat(filled) + "░".repeat(blocks - filled);

  return (
    <div className="space-y-1">
      {/* Pixel block bar */}
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-base tracking-[2px] ${c.text} ${percent > 0 ? c.shadow : ""}`}
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          {bar}
        </span>
        <span className={`font-[family-name:var(--font-pixel-stack)] text-xs ${c.text} min-w-[3ch] text-right`}>
          {percent}%
        </span>
      </div>

      {/* Smooth bar underneath */}
      <div className={`w-full h-1.5 bg-pixel-dark border ${c.border}`}>
        <div
          className={`h-full ${c.bar} transition-all duration-150`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {label && (
        <p className={`text-sm ${c.text} font-[family-name:var(--font-pixel-stack)] text-[11px]`}>
          {label}
        </p>
      )}
    </div>
  );
}
