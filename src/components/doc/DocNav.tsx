"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BookOpen, Code2, Terminal, Wifi, Wrench, Bot, Check, Copy } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import { useT } from "@/lib/i18n";

const TABS = [
  { href: "/doc", labelKey: "doc.nav.overview", icon: <BookOpen size={14} /> },
  { href: "/doc/api", labelKey: "doc.nav.api", icon: <Code2 size={14} /> },
  { href: "/doc/cli", labelKey: "doc.nav.cli", icon: <Terminal size={14} /> },
  { href: "/doc/p2p", labelKey: "doc.nav.p2p", icon: <Wifi size={14} /> },
  { href: "/doc/limits", labelKey: "doc.nav.limits", icon: <Wrench size={14} /> },
] as const;

export default function DocNav() {
  const t = useT();
  const pathname = usePathname();
  const { copied, copy } = useClipboard();

  const llmUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/doc/llm`
      : "/api/doc/llm";

  return (
    <div className="space-y-3">
      <div className="flex border-b-2 border-pixel-green/20 overflow-x-auto">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-[family-name:var(--font-pixel-stack)] transition-all shrink-0 ${
                active ? "tab-active" : "tab-inactive"
              }`}
            >
              {tab.icon}
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>

      {/* Teach Your Agent */}
      <button
        onClick={() => copy(llmUrl)}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 border text-xs font-[family-name:var(--font-pixel-stack)] transition-all ${
          copied
            ? "border-pixel-green text-pixel-green bg-pixel-green/10"
            : "border-pixel-cyan/30 text-pixel-cyan hover:bg-pixel-cyan/10 hover:border-pixel-cyan/50"
        }`}
      >
        {copied ? (
          <>
            <Check size={12} />
            {t("doc.nav.agentCopied")}
          </>
        ) : (
          <>
            <Bot size={12} />
            {t("doc.nav.agentCopy")}
          </>
        )}
      </button>
    </div>
  );
}
