"use client";
import { useEffect, useRef, useState } from "react";
import { User, LogOut, BadgeCheck, MailWarning } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";

export default function ProfileMenu() {
  const { email, verified, openAuth, logout } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!email) {
    return (
      <button
        onClick={openAuth}
        className="text-pixel-gray hover:text-pixel-cyan transition-colors p-1"
        aria-label={t("profile.signIn")}
      >
        <User size={18} />
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-8 h-8 flex items-center justify-center transition-opacity ${
          open ? "opacity-100" : "opacity-85 hover:opacity-100"
        }`}
        aria-label={t("profile.account")}
        aria-expanded={open}
      >
        <img
          src="/assets/avatar-default.png"
          alt=""
          width={30}
          height={30}
          className="pixelated"
        />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 border-2 border-pixel-cyan/40 bg-pixel-darker min-w-[200px] shadow-[4px_4px_0_var(--pixel-accent-15)]">
          <div className="px-3 py-2.5 border-b border-pixel-cyan/20">
            <p className="text-pixel-cyan text-sm break-all">{email}</p>
            {verified ? (
              <p className="text-pixel-green text-xs mt-1.5 flex items-center gap-1.5">
                <BadgeCheck size={11} /> {t("profile.verified")}
              </p>
            ) : (
              <p className="text-pixel-amber text-xs mt-1.5 flex items-center gap-1.5">
                <MailWarning size={11} /> {t("profile.unverified")}
              </p>
            )}
          </div>
          {!verified && (
            <button
              onClick={() => {
                setOpen(false);
                openAuth();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-pixel-amber hover:bg-pixel-green/5 transition-colors"
            >
              <MailWarning size={12} /> {t("profile.verifyNow")}
            </button>
          )}
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-pixel-gray hover:text-pixel-pink hover:bg-pixel-green/5 transition-colors"
          >
            <LogOut size={12} /> {t("profile.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
