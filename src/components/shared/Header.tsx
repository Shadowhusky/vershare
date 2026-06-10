"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, X, Github } from "lucide-react";
import HelpWizard from "./HelpWizard";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { useT } from "@/lib/i18n";
import ProfileMenu from "./ProfileMenu";

const LS_KEY = "vershare_wizard_seen";

export default function Header() {
  const t = useT();
  const pathname = usePathname();
  // The guided tour anchors elements that only exist on the home page
  const helpAvailable = pathname === "/";
  const [showHelp, setShowHelp] = useState(false);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check localStorage first (anonymous users)
    if (localStorage.getItem(LS_KEY)) return;

    // Check server for logged-in users
    fetch("/api/auth/me")
      .then((r) => (r.ok ? (r.json() as Record<string, any>) : null))
      .then((data) => {
        if (data?.wizardSeen) {
          // Sync to localStorage so we don't check again
          localStorage.setItem(LS_KEY, "1");
          return;
        }
        // First visit — point at the help button instead of opening the wizard
        setTimeout(() => setShowTip(true), 600);
      })
      .catch(() => {
        // Not logged in, localStorage not set — first visit
        setTimeout(() => setShowTip(true), 600);
      });
  }, []);

  const markSeen = () => {
    localStorage.setItem(LS_KEY, "1");
    fetch("/api/auth/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wizardSeen: true }),
    }).catch(() => {});
  };

  const dismissTip = () => {
    setShowTip(false);
    markSeen();
  };

  const openHelp = () => {
    setShowTip(false);
    setShowHelp(true);
  };

  const handleClose = () => {
    setShowHelp(false);
    markSeen();
  };

  return (
    <>
      <header className="shrink-0 border-b-2 border-pixel-green/20 px-3 py-3 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 sm:gap-3 group">
            <img
              src="/assets/logo.png"
              alt="VerShare"
              width={28}
              height={28}
              className="rounded-full! sm:w-9 sm:h-9"
            />
            <h1 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-glow text-xs sm:text-base tracking-wider">
              VERSHARE
            </h1>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <ProfileMenu />
            {helpAvailable && (
            <div className="relative">
              <button
                onClick={openHelp}
                className={`transition-colors p-1 ${
                  showTip
                    ? "text-pixel-green animate-pulse"
                    : "text-pixel-gray hover:text-pixel-green"
                }`}
                aria-label={t("header.help")}
              >
                <HelpCircle size={18} />
              </button>
              {showTip && (
                <div className="absolute top-full right-0 mt-2 w-60 z-40">
                  <div className="absolute -top-[6px] right-[10px] w-3 h-3 bg-pixel-darker border-l-2 border-t-2 border-pixel-green rotate-45" />
                  <div className="border-2 border-pixel-green bg-pixel-darker p-3 shadow-[0_0_16px_rgba(57,255,20,0.25)]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-pixel-green text-xs font-[family-name:var(--font-pixel-stack)] leading-relaxed">
                        {t("header.tip.title")}
                      </p>
                      <button
                        onClick={dismissTip}
                        className="text-pixel-gray hover:text-pixel-pink shrink-0 -mt-0.5"
                        aria-label={t("header.tip.dismiss")}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <p className="text-pixel-gray text-sm mt-2 leading-relaxed">
                      {t("header.tip.body", { icon: "?" })}
                    </p>
                  </div>
                </div>
              )}
            </div>
            )}
            <a
              href="https://github.com/Shadowhusky/vershare"
              target="_blank"
              rel="noopener"
              className="text-pixel-gray hover:text-pixel-green transition-colors p-1"
              aria-label="GitHub"
            >
              <Github size={18} />
            </a>
            <a
              href="/doc"
              className="text-pixel-gray text-xs sm:text-sm hover:text-pixel-cyan transition-colors"
            >
              {t("header.docs")}
            </a>
          </div>
        </div>
      </header>
      <HelpWizard
        open={showHelp}
        onClose={handleClose}
        onRequestContent={() => {
          window.dispatchEvent(new CustomEvent("vershare:inject-demo"));
        }}
      />
    </>
  );
}
