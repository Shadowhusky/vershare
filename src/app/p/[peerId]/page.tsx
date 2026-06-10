import P2PReceiver from "@/components/view/P2PReceiver";

interface Props {
  params: Promise<{ peerId: string }>;
}

export const metadata = {
  title: "Receiving Drop - VerShare",
};

export default async function P2PReceivePage({ params }: Props) {
  const { peerId } = await params;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-[family-name:var(--font-pixel-stack)] text-pixel-purple text-sm">
          &gt; P2P DROP INCOMING
        </h2>
        <p className="text-pixel-gray text-xs">
          Direct browser-to-browser transfer. No server storage.
        </p>
      </div>
      <P2PReceiver peerId={peerId} />
    </div>
  );
}
