"use client";

interface RecentShare {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  fileSize: number;
}

interface RecentSharesTableProps {
  data: RecentShare[];
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const typeColors: Record<string, string> = {
  text: "text-pixel-green",
  markdown: "text-pixel-cyan",
  code: "text-pixel-amber",
  file: "text-pixel-pink",
  image: "text-pixel-purple",
};

export default function RecentSharesTable({ data }: RecentSharesTableProps) {
  return (
    <div className="pixel-border bg-pixel-dark/80 p-4">
      <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">
        RECENT SHARES
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-pixel-green/20">
              <th className="text-left py-2 px-2 text-pixel-green font-[family-name:var(--font-pixel-stack)] text-[10px]">
                ID
              </th>
              <th className="text-left py-2 px-2 text-pixel-green font-[family-name:var(--font-pixel-stack)] text-[10px]">
                TYPE
              </th>
              <th className="text-left py-2 px-2 text-pixel-green font-[family-name:var(--font-pixel-stack)] text-[10px]">
                TITLE
              </th>
              <th className="text-left py-2 px-2 text-pixel-green font-[family-name:var(--font-pixel-stack)] text-[10px]">
                DATE
              </th>
              <th className="text-right py-2 px-2 text-pixel-green font-[family-name:var(--font-pixel-stack)] text-[10px]">
                SIZE
              </th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-pixel-gray">
                  No shares yet
                </td>
              </tr>
            ) : (
              data.map((share) => (
                <tr
                  key={share.id}
                  className="border-b border-pixel-green/10 hover:bg-pixel-green/5 transition-colors"
                >
                  <td className="py-2 px-2 text-pixel-gray font-mono">
                    <a
                      href={`/s/${share.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-pixel-cyan transition-colors"
                    >
                      {share.id.slice(0, 8)}
                    </a>
                  </td>
                  <td className={`py-2 px-2 font-[family-name:var(--font-pixel-stack)] text-[10px] ${typeColors[share.type] || "text-pixel-gray"}`}>
                    {share.type.toUpperCase()}
                  </td>
                  <td className="py-2 px-2 text-pixel-gray max-w-[200px] truncate">
                    {share.title}
                  </td>
                  <td className="py-2 px-2 text-pixel-gray whitespace-nowrap">
                    {formatDate(share.createdAt)}
                  </td>
                  <td className="py-2 px-2 text-pixel-gray text-right whitespace-nowrap">
                    {formatSize(share.fileSize)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
