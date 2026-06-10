"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface WeeklyComparisonChartProps {
  thisWeek: Array<{ day: string; count: number }>;
  lastWeek: Array<{ day: string; count: number }>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="pixel-border bg-pixel-darker p-2 text-xs">
        <p className="text-pixel-gray mb-1">{label}</p>
        {payload.map((entry) => (
          <p
            key={entry.dataKey}
            className="font-[family-name:var(--font-pixel-stack)]"
            style={{ color: entry.color }}
          >
            {entry.dataKey === "thisWeek" ? "THIS WK" : "LAST WK"}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function WeeklyComparisonChart({ thisWeek, lastWeek }: WeeklyComparisonChartProps) {
  if (thisWeek.length === 0 && lastWeek.length === 0) {
    return (
      <div className="pixel-border bg-pixel-dark/80 p-4 h-full flex items-center justify-center">
        <p className="text-pixel-gray text-xs font-[family-name:var(--font-pixel-stack)]">
          NO DATA
        </p>
      </div>
    );
  }

  const maxLen = Math.max(thisWeek.length, lastWeek.length);
  const merged = Array.from({ length: maxLen }, (_, i) => ({
    day: thisWeek[i]?.day || lastWeek[i]?.day || `Day ${i + 1}`,
    thisWeek: thisWeek[i]?.count ?? 0,
    lastWeek: lastWeek[i]?.count ?? 0,
  }));

  return (
    <div className="pixel-border bg-pixel-dark/80 p-4">
      <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">
        WEEKLY COMPARISON
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(57,255,20,0.1)" />
          <XAxis
            dataKey="day"
            tick={{ fill: "#888899", fontSize: 10 }}
            stroke="rgba(57,255,20,0.2)"
          />
          <YAxis
            tick={{ fill: "#888899", fontSize: 10 }}
            allowDecimals={false}
            stroke="rgba(57,255,20,0.2)"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) => (
              <span className="text-pixel-gray text-[10px]">
                {value === "thisWeek" ? "THIS WEEK" : "LAST WEEK"}
              </span>
            )}
          />
          <Line
            type="monotone"
            dataKey="thisWeek"
            stroke="#7ee787"
            strokeWidth={2}
            dot={{ fill: "#7ee787", r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="lastWeek"
            stroke="#888899"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: "#888899", r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
