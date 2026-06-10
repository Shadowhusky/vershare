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

interface TopLanguagesChartProps {
  data: Array<{ language: string; count: number }>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="pixel-border bg-pixel-darker p-2 text-xs">
        <p className="text-pixel-gray mb-1">{label}</p>
        <p className="text-pixel-purple font-[family-name:var(--font-pixel-stack)]">
          {payload[0].value} shares
        </p>
      </div>
    );
  }
  return null;
};

export default function TopLanguagesChart({ data }: TopLanguagesChartProps) {
  if (data.length === 0) {
    return (
      <div className="pixel-border bg-pixel-dark/80 p-4 h-full flex items-center justify-center">
        <p className="text-pixel-gray text-xs font-[family-name:var(--font-pixel-stack)]">
          NO CODE SHARES YET
        </p>
      </div>
    );
  }

  return (
    <div className="pixel-border bg-pixel-dark/80 p-4">
      <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-purple text-xs mb-4">
        TOP LANGUAGES
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(176,0,255,0.1)" />
          <XAxis
            type="number"
            tick={{ fill: "#888899", fontSize: 10 }}
            allowDecimals={false}
            stroke="rgba(176,0,255,0.2)"
          />
          <YAxis
            type="category"
            dataKey="language"
            tick={{ fill: "#888899", fontSize: 10 }}
            width={80}
            stroke="rgba(176,0,255,0.2)"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#b000ff" opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
