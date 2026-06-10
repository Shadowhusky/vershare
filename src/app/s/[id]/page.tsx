import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getShareChecked } from "@/lib/shares";
import { getUserFromCookies } from "@/lib/user-auth";
import ShareView from "@/components/view/ShareView";
import ExpiredView from "@/components/view/ExpiredView";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const { share, expired } = await getShareChecked(id);
  if (!share || expired) return { title: expired ? "Expired - VerShare" : "Not Found - VerShare" };

  const h = await headers();
  const host = h.get("host") || "localhost:7749";
  const proto = h.get("x-forwarded-proto") || "http";
  const base = `${proto}://${host}`;

  const title = `${share.title || share.fileName || share.type.toUpperCase()} - VerShare`;
  const rawUrl = `${base}/api/shares/${share.id}/raw`;
  const shareUrl = `${base}/s/${share.id}`;
  const mime = share.mimeType || "";
  const isImage = share.type === "image" || mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");

  const description =
    share.type === "text" || share.type === "markdown" || share.type === "code"
      ? `Shared ${share.type}${share.title ? `: ${share.title}` : ""} on VerShare`
      : `${share.fileName || share.type} shared on VerShare`;

  const ogImage = isImage ? rawUrl : `${base}/assets/og-banner.png`;

  // Build OG metadata
  const openGraph: Record<string, unknown> = {
    title,
    description,
    url: shareUrl,
    siteName: "VerShare",
    type: isVideo ? "video.other" : "article",
    images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
  };

  // Video OG tags
  if (isVideo) {
    openGraph.videos = [{
      url: rawUrl,
      type: mime,
      width: 1280,
      height: 720,
    }];
  }

  // Audio OG tags
  if (isAudio) {
    openGraph.audio = [{
      url: rawUrl,
      type: mime,
    }];
  }

  // Twitter card
  const twitterCard = isImage
    ? "summary_large_image"
    : isVideo
      ? "player"
      : "summary";

  const twitter: Record<string, unknown> = {
    card: twitterCard,
    title,
    description,
    images: [ogImage],
  };

  if (isVideo) {
    twitter.players = [{
      playerUrl: rawUrl,
      streamUrl: rawUrl,
      width: 1280,
      height: 720,
    }];
  }

  return {
    metadataBase: new URL(base),
    title,
    description,
    openGraph,
    twitter,
    other: {
      // Additional meta for better unfurling
      ...(isImage ? { "og:image:type": mime } : {}),
      ...(isVideo ? {
        "og:video:type": mime,
        "og:video:width": "1280",
        "og:video:height": "720",
      } : {}),
      ...(isAudio ? { "og:audio:type": mime } : {}),
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const { share, expired, gone } = await getShareChecked(id);

  if (!share) notFound();

  const userEmail = await getUserFromCookies();
  const isOwner = !!userEmail && !!share.createdBy && share.createdBy === userEmail;

  if (gone) return <ExpiredView gone />;
  if (expired)
    return <ExpiredView shareId={share.id} isOwner={isOwner} expiresAt={share.expiresAt} />;

  const { createdBy: _createdBy, ...publicShare } = share;
  return <ShareView share={{ ...publicShare, isOwner }} />;
}
