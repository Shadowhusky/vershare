import type { Metadata, Viewport } from "next";
import { headers, cookies } from "next/headers";
import { Press_Start_2P, JetBrains_Mono } from "next/font/google";
import Header from "@/components/shared/Header";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import { isLocale, parseAcceptLanguage, LOCALE_COOKIE } from "@/lib/i18n/shared";
import Footer from "@/components/shared/Footer";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("host") || "localhost:7749";
  const proto = h.get("x-forwarded-proto") || "http";
  const base = `${proto}://${host}`;

  const title = "VerShare — Free, Fast & Simple File Sharing";
  const description =
    "Share files, images, text, code & markdown in seconds. Free, fast and simple — no signup needed. Instant links, P2P browser-to-browser transfer, auto-expiring shares.";

  return {
    metadataBase: new URL(base),
    title: {
      default: title,
      template: "%s | VerShare",
    },
    description,
    keywords: [
      "file sharing",
      "free file sharing",
      "share files online",
      "send large files",
      "text sharing",
      "code sharing",
      "pastebin alternative",
      "p2p file transfer",
      "temporary file sharing",
    ],
    alternates: {
      canonical: base,
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: "/assets/logo.png",
      apple: "/assets/logo.png",
    },
    openGraph: {
      title,
      description,
      url: base,
      images: [
        {
          url: `${base}/assets/og-banner.png`,
          width: 1200,
          height: 630,
          alt: "VerShare — free, fast & simple file sharing",
        },
      ],
      type: "website",
      siteName: "VerShare",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${base}/assets/og-banner.png`],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : parseAcceptLanguage((await headers()).get("accept-language"));

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('vershare_theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}",
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "VerShare",
              url: "https://vershare.uk",
              description:
                "Share files, images, text, code & markdown in seconds. Free, fast and simple — no signup needed.",
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Any",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${pressStart.variable} ${jetbrains.variable} scanlines`}
      >
        <I18nProvider initialLocale={locale}>
          <AuthProvider>
          <div className="relative z-10 h-dvh flex flex-col overflow-hidden">
            <Header />

            <main className="flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-8 sm:py-6">
              <div className="mx-auto h-full max-w-6xl">{children}</div>
            </main>

            <Footer />
          </div>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
