"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ShareTypePieChartProps {
  data: Record<string, number>;
}

const COLORS: Record<string, string> = {
  text: "#39ff14",
  markdown: "#00d4ff",
  code: "#ffb000",
  file: "#ff6ec7",
  image: "#b000ff",
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="pixel-border bg-pixel-darker p-2 text-xs">
        <p className="text-pixel-green font-[family-name:var(--font-pixel-stack)]">
          {payload[0].name}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export default function ShareTypePieChart({ data }: ShareTypePieChartProps) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));

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
      <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-cyan text-xs mb-4">
        SHARES BY TYPE
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] || "#39ff14"} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) => (
              <span className="text-pixel-gray text-[10px]">{value.toUpperCase()}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
