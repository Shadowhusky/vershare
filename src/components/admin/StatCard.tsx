"use client";

import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: "green" | "cyan" | "amber" | "pink" | "purple";
}

const colorMap = {
  green: "text-pixel-green",
  cyan: "text-pixel-cyan",
  amber: "text-pixel-amber",
  pink: "text-pixel-pink",
  purple: "text-pixel-purple",
};

const glowMap = {
  green: "text-glow",
  cyan: "text-glow-cyan",
  amber: "text-glow-amber",
  pink: "",
  purple: "",
};

export default function StatCard({ label, value, icon, color = "green" }: StatCardProps) {
  return (
    <div className="pixel-border bg-pixel-dark/80 p-4 hover:bg-pixel-dark/60 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-2xl ${colorMap[color]}`}>{icon}</span>
        <span className="text-pixel-gray/40 text-[10px] font-[family-name:var(--font-pixel-stack)] uppercase">
          {label}
        </span>
      </div>
      <div className={`font-[family-name:var(--font-pixel-stack)] text-lg ${colorMap[color]} ${glowMap[color]}`}>
        {value}
      </div>
    </div>
  );
}
