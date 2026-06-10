"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface CumulativeGrowthChartProps {
  data: Array<{ date: string; total: number }>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="pixel-border bg-pixel-darker p-2 text-xs">
        <p className="text-pixel-gray mb-1">{label}</p>
        <p className="text-pixel-purple font-[family-name:var(--font-pixel-stack)]">
          {payload[0].value.toLocaleString()} total
        </p>
      </div>
    );
  }
  return null;
};

export default function CumulativeGrowthChart({ data }: CumulativeGrowthChartProps) {
  if (data.length === 0) {
    return (
      <div className="pixel-border bg-pixel-dark/80 p-4 h-full flex items-center justify-center">
        <p className="text-pixel-gray text-xs font-[family-name:var(--font-pixel-stack)]">
          NO DATA
        </p>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  return (
    <div className="pixel-border bg-pixel-dark/80 p-4">
      <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-purple text-xs mb-4">
        CUMULATIVE GROWTH
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={formatted}>
          <defs>
            <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#b000ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#b000ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(176,0,255,0.1)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#888899", fontSize: 9 }}
            interval="preserveStartEnd"
            stroke="rgba(176,0,255,0.2)"
          />
          <YAxis
            tick={{ fill: "#888899", fontSize: 10 }}
            allowDecimals={false}
            stroke="rgba(176,0,255,0.2)"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#b000ff"
            strokeWidth={2}
            fill="url(#purpleGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
