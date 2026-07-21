// What can we render for a given filename — shared by the archive browser
// and direct file shares.
import { inferMimeType } from "./mime";

export type PreviewKind = "image" | "markdown" | "code" | "text" | "media" | "other";

// svg is safe here: previews render through <img>, which never executes scripts
export const IMG_EXT = /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)$/i;
const MD_EXT = /\.(md|markdown)$/i;
const TEXT_EXT = /\.(txt|log|csv|tsv|ini|cfg|conf|env|gitignore|license|readme)$/i;
const CODE_LANG: Record<string, string> = {
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript",
  py: "python", java: "java", c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp",
  cs: "csharp", go: "go", rs: "rust", rb: "ruby", php: "php", swift: "swift",
  kt: "kotlin", css: "css", scss: "css", sql: "sql",
  sh: "bash", bash: "bash", zsh: "bash", json: "json", yml: "yaml", yaml: "yaml",
  toml: "yaml", xml: "xml",
};

export const MAX_TEXT_PREVIEW = 2 * 1024 * 1024;

export function detectPreviewKind(name: string): { kind: PreviewKind; language?: string; mime?: string } {
  if (IMG_EXT.test(name)) return { kind: "image" };
  if (MD_EXT.test(name)) return { kind: "markdown" };
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (CODE_LANG[ext]) return { kind: "code", language: CODE_LANG[ext] };
  if (TEXT_EXT.test(name) || /^\./.test(name)) return { kind: "text" };
  const mime = inferMimeType(name);
  if (
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime === "application/pdf" ||
    ext === "html" ||
    ext === "htm"
  ) {
    return { kind: "media", mime: ext === "html" || ext === "htm" ? "text/html" : mime };
  }
  return { kind: "other" };
}
