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

interface SharesOverTimeChartProps {
  data: Array<{ date: string; count: number }>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="pixel-border bg-pixel-darker p-2 text-xs">
        <p className="text-pixel-gray mb-1">{label}</p>
        <p className="text-pixel-green font-[family-name:var(--font-pixel-stack)]">
          {payload[0].value} shares
        </p>
      </div>
    );
  }
  return null;
};

export default function SharesOverTimeChart({ data }: SharesOverTimeChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  return (
    <div className="pixel-border bg-pixel-dark/80 p-4">
      <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">
        SHARES / LAST 30 DAYS
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={formatted}>
          <defs>
            <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7ee787" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7ee787" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(57,255,20,0.1)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#888899", fontSize: 9 }}
            interval="preserveStartEnd"
            stroke="rgba(57,255,20,0.2)"
          />
          <YAxis
            tick={{ fill: "#888899", fontSize: 10 }}
            allowDecimals={false}
            stroke="rgba(57,255,20,0.2)"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#7ee787"
            strokeWidth={2}
            fill="url(#greenGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
