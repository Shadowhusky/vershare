"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (el: HTMLElement, options: object) => void;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleSignInButtonProps {
  onSuccess: (email: string) => void;
  onError: (message: string) => void;
}

export default function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onSuccess, onError });
  callbacksRef.current = { onSuccess, onError };
  const tRef = useRef(t);
  tRef.current = t;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    const init = () => {
      if (cancelled || !window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response: { credential: string }) => {
          try {
            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
            });
            const data = await res.json() as Record<string, any>;
            if (!res.ok) throw new Error(data.error || tRef.current("auth.error.google"));
            callbacksRef.current.onSuccess(data.email);
          } catch (err) {
            callbacksRef.current.onError(
              err instanceof Error ? err.message : tRef.current("auth.error.google")
            );
          }
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "filled_black",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "center",
        width: 300,
      });
      setReady(true);
    };

    if (window.google) {
      init();
    } else {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener("load", init);
      } else {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = init;
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="relative h-10 w-[300px]">
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" />
          {!ready && (
            <span className="absolute inset-0 flex items-center justify-center text-pixel-gray/50 text-xs font-[family-name:var(--font-pixel-stack)] animate-pulse pointer-events-none">
              {t("auth.loadingGoogle")}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-pixel-green/20" />
        <span className="text-pixel-gray/50 text-xs font-[family-name:var(--font-pixel-stack)]">{t("auth.or")}</span>
        <div className="flex-1 border-t border-pixel-green/20" />
      </div>
    </div>
  );
}
