"use client";
import { useEffect, useRef, useState } from "react";
import { LOCALES, Locale, useI18n } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-pixel-gray hover:text-pixel-green transition-colors p-1 text-lg leading-none"
        aria-label={t("lang.switch")}
        aria-expanded={open}
      >
        <span className="grayscale-[0.3]">{LOCALES[locale].flag}</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 border-2 border-pixel-green/40 bg-pixel-darker min-w-[148px] shadow-[4px_4px_0_var(--pixel-accent-15)]">
          {(Object.keys(LOCALES) as Locale[]).map((code) => (
            <button
              key={code}
              onClick={() => {
                setLocale(code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                code === locale
                  ? "text-pixel-green bg-pixel-green/10"
                  : "text-pixel-gray hover:text-pixel-green hover:bg-pixel-green/5"
              }`}
            >
              <span className="text-base">{LOCALES[code].flag}</span>
              <span>{LOCALES[code].label}</span>
              {code === locale && <span className="ml-auto text-pixel-green">■</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
