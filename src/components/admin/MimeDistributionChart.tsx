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

interface MimeDistributionChartProps {
  data: Array<{ mimeType: string; count: number }>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="pixel-border bg-pixel-darker p-2 text-xs">
        <p className="text-pixel-gray mb-1">{label}</p>
        <p className="text-pixel-pink font-[family-name:var(--font-pixel-stack)]">
          {payload[0].value} files
        </p>
      </div>
    );
  }
  return null;
};

export default function MimeDistributionChart({ data }: MimeDistributionChartProps) {
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
      <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-pink text-xs mb-4">
        MIME TYPES
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,110,199,0.1)" />
          <XAxis
            type="number"
            tick={{ fill: "#888899", fontSize: 10 }}
            allowDecimals={false}
            stroke="rgba(255,110,199,0.2)"
          />
          <YAxis
            type="category"
            dataKey="mimeType"
            tick={{ fill: "#888899", fontSize: 10 }}
            width={100}
            stroke="rgba(255,110,199,0.2)"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#ff6ec7" opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
