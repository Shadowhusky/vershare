import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ApiDoc from "@/components/doc/ApiDoc";
import CliDoc from "@/components/doc/CliDoc";
import P2PDoc from "@/components/doc/P2PDoc";
import LimitsDoc from "@/components/doc/LimitsDoc";

const VALID_TABS = ["api", "cli", "p2p", "limits"];

interface Props {
  params: Promise<{ tab: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { tab } = await params;
  const titles: Record<string, string> = {
    api: "API Reference",
    cli: "CLI Integration",
    p2p: "P2P Mode",
    limits: "Limits & Formats",
  };
  return {
    title: `${titles[tab] || "Docs"} - VerShare`,
  };
}

export default async function DocTabPage({ params }: Props) {
  const { tab } = await params;
  if (!VALID_TABS.includes(tab)) notFound();

  const h = await headers();
  const host = h.get("host") || "localhost:7749";
  const proto = h.get("x-forwarded-proto") || "http";
  const base = `${proto}://${host}`;

  switch (tab) {
    case "api":
      return <ApiDoc base={base} />;
    case "cli":
      return <CliDoc base={base} />;
    case "p2p":
      return <P2PDoc />;
    case "limits":
      return <LimitsDoc />;
    default:
      notFound();
  }
}
