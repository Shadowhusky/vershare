export const LOCALE_CODES = ["en", "zh", "es", "fr", "de", "ja"] as const;
export type Locale = (typeof LOCALE_CODES)[number];

export const LOCALE_COOKIE = "vershare_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALE_CODES as readonly string[]).includes(value);
}

export function matchLocale(lang: string): Locale | null {
  const lower = lang.toLowerCase();
  if (lower.startsWith("zh")) return "zh";
  const short = lower.slice(0, 2);
  return isLocale(short) ? short : null;
}

export function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return "en";
  const langs = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? parseFloat(qParam.split("=")[1]) : 1;
      return { tag: tag.trim(), q: isNaN(q) ? 0 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of langs) {
    const match = matchLocale(tag);
    if (match) return match;
  }
  return "en";
}
