"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface SizeDistributionChartProps {
  data: Array<{ range: string; count: number }>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="pixel-border bg-pixel-darker p-2 text-xs">
        <p className="text-pixel-gray mb-1">{label}</p>
        <p className="text-pixel-cyan font-[family-name:var(--font-pixel-stack)]">
          {payload[0].value} shares
        </p>
      </div>
    );
  }
  return null;
};

export default function SizeDistributionChart({ data }: SizeDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="pixel-border bg-pixel-dark/80 p-4 h-full flex items-center justify-center">
        <p className="text-pixel-gray text-xs font-[family-name:var(--font-pixel-stack)]">
          NO DATA
        </p>
      </div>
    );
  }

  return (
    <div className="pixel-border bg-pixel-dark/80 p-4">
      <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-cyan text-xs mb-4">
        SIZE DISTRIBUTION
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
          <XAxis
            dataKey="range"
            tick={{ fill: "#888899", fontSize: 9 }}
            stroke="rgba(0,212,255,0.2)"
          />
          <YAxis
            tick={{ fill: "#888899", fontSize: 10 }}
            allowDecimals={false}
            stroke="rgba(0,212,255,0.2)"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#00d4ff" opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
