"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface StorageByTypeChartProps {
  data: Record<string, number>;
}

const COLORS: Record<string, string> = {
  text: "#39ff14",
  markdown: "#00d4ff",
  code: "#ffb000",
  file: "#ff6ec7",
  image: "#b000ff",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="pixel-border bg-pixel-darker p-2 text-xs">
        <p className="text-pixel-gray mb-1">{label?.toUpperCase()}</p>
        <p className="text-pixel-green font-[family-name:var(--font-pixel-stack)]">
          {formatBytes(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function StorageByTypeChart({ data }: StorageByTypeChartProps) {
  const chartData = Object.entries(data)
    .filter(([, bytes]) => bytes > 0)
    .map(([type, bytes]) => ({ type, bytes, fill: COLORS[type] || "#39ff14" }));

  if (chartData.length === 0) {
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
      <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">
        STORAGE BY TYPE
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(57,255,20,0.1)" />
          <XAxis
            dataKey="type"
            tick={{ fill: "#888899", fontSize: 10 }}
            stroke="rgba(57,255,20,0.2)"
            tickFormatter={(v: string) => v.toUpperCase()}
          />
          <YAxis
            tick={{ fill: "#888899", fontSize: 10 }}
            allowDecimals={false}
            stroke="rgba(57,255,20,0.2)"
            tickFormatter={formatBytes}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="bytes" opacity={0.8}>
            {chartData.map((entry) => (
              <Cell key={entry.type} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
