"use client";

interface StorageGaugeProps {
  usedBytes: number;
  maxBytes?: number;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function StorageGauge({ usedBytes, maxBytes = 10 * 1024 * 1024 * 1024 }: StorageGaugeProps) {
  const percent = Math.min((usedBytes / maxBytes) * 100, 100);

  let barColor = "bg-pixel-green";
  if (percent > 80) barColor = "bg-pixel-pink";
  else if (percent > 60) barColor = "bg-pixel-amber";

  return (
    <div className="pixel-border bg-pixel-dark/80 p-4">
      <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-cyan text-xs mb-4">
        STORAGE
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between text-xs">
          <span className="text-pixel-gray">{formatSize(usedBytes)} used</span>
          <span className="text-pixel-gray">{formatSize(maxBytes)} max</span>
        </div>
        <div className="w-full h-4 pixel-border bg-pixel-darker overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-center font-[family-name:var(--font-pixel-stack)] text-pixel-cyan text-xs">
          {percent.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
