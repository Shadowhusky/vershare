"use client";
import { useT } from "@/lib/i18n";

export default function CliDoc({ base }: { base: string }) {
  const t = useT();
  return (
    <div className="space-y-4">
      <p className="text-pixel-gray text-base">
        {t("doc.cli.addTo")} <code className="text-pixel-cyan">.bashrc</code> /{" "}
        <code className="text-pixel-cyan">.zshrc</code>:
      </p>
      <pre className="bg-pixel-darker/80 border border-pixel-purple/20 p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-pixel-green/80">{`vershare() {
  local BASE="${base}"
  if [ -f "$1" ]; then
    local mime=$(file -b --mime-type "$1")
    local type="file"
    [[ "$mime" == image/* ]] && type="image"
    curl -s -X POST "$BASE/api/shares" \\
      -F "type=$type" -F "file=@$1" | jq -r '.url'
  elif [ -n "$1" ]; then
    curl -s -X POST "$BASE/api/shares" \\
      -H 'Content-Type: application/json' \\
      -d "$(jq -nc --arg c "$1" '{type:"text",content:$c}')" | jq -r '.url'
  else
    local content=$(cat)
    curl -s -X POST "$BASE/api/shares" \\
      -H 'Content-Type: application/json' \\
      -d "$(jq -nc --arg c "$content" '{type:"text",content:$c}')" | jq -r '.url'
  fi
}`}</code>
      </pre>

      <div className="space-y-2">
        <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-gray text-xs">
          {t("doc.cli.examples")}
        </p>
        {[
          [t("doc.cli.example.shareFile"), "vershare report.pdf"],
          [t("doc.cli.example.shareImage"), "vershare screenshot.png"],
          [t("doc.cli.example.shareText"), 'vershare "hello world"'],
          [t("doc.cli.example.pipeStdin"), 'echo "data" | vershare'],
          [t("doc.cli.example.clipboard"), "pbpaste | vershare"],
          [t("doc.cli.example.shareCopyLink"), "vershare notes.md | pbcopy"],
        ].map(([label, code]) => (
          <div key={label} className="flex gap-3 text-sm items-start">
            <span className="text-pixel-gray/40 shrink-0 w-36">
              # {label}
            </span>
            <code className="text-pixel-green/80">{code}</code>
          </div>
        ))}
      </div>

      <p className="text-pixel-gray/50 text-sm">
        {t("doc.cli.requires")} <code className="text-pixel-cyan">curl</code> +{" "}
        <code className="text-pixel-cyan">jq</code>. {t("doc.cli.install")}{" "}
        <code className="text-pixel-cyan/60">brew install jq</code> {t("doc.cli.or")}{" "}
        <code className="text-pixel-cyan/60">apt install jq</code>
      </p>
    </div>
  );
}
