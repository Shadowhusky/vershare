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

interface HourlyHeatmapProps {
  data: Array<{ hour: number; count: number }>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="pixel-border bg-pixel-darker p-2 text-xs">
        <p className="text-pixel-gray mb-1">{String(label).padStart(2, "0")}:00</p>
        <p className="text-pixel-amber font-[family-name:var(--font-pixel-stack)]">
          {payload[0].value} shares
        </p>
      </div>
    );
  }
  return null;
};

export default function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: String(d.hour).padStart(2, "0"),
  }));

  return (
    <div className="pixel-border bg-pixel-dark/80 p-4">
      <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-amber text-xs mb-4">
        HOURLY DISTRIBUTION
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,176,0,0.1)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#888899", fontSize: 8 }}
            stroke="rgba(255,176,0,0.2)"
          />
          <YAxis
            tick={{ fill: "#888899", fontSize: 10 }}
            allowDecimals={false}
            stroke="rgba(255,176,0,0.2)"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#ffb000" opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
