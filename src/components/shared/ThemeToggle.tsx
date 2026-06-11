"use client";
import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useT } from "@/lib/i18n";

const THEME_KEY = "vershare_theme";

export default function ThemeToggle({ initialTheme }: { initialTheme: "dark" | "light" }) {
  const t = useT();
  // SSR already resolved the theme from the cookie — no mount-time flip
  const [theme, setTheme] = useState<"dark" | "light">(initialTheme);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") {
      document.documentElement.dataset.theme = "light";
    } else {
      delete document.documentElement.dataset.theme;
    }
    localStorage.setItem(THEME_KEY, next);
    document.cookie = `${THEME_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <button
      onClick={toggle}
      className="text-pixel-gray hover:text-pixel-amber transition-colors p-1"
      aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
