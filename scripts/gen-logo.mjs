import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ASSETS_DIR = path.join(process.cwd(), "public", "assets");

async function generateImage(prompt, filename) {
  console.log(`Generating: ${filename}...`);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
    config: { responseModalities: ["TEXT", "IMAGE"] },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, "base64");
      const filePath = path.join(ASSETS_DIR, filename);
      fs.writeFileSync(filePath, buffer);
      console.log(`  Saved: ${filePath} (${(buffer.length / 1024).toFixed(1)}KB)`);
      return true;
    }
  }
  return false;
}

async function removeBg(filename, threshold = 42) {
  const filePath = path.join(ASSETS_DIR, filename);
  const img = sharp(filePath);
  const { width, height } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();
  const out = Buffer.from(raw);
  const bgR = out[0], bgG = out[1], bgB = out[2];
  console.log(`  BG: rgb(${bgR},${bgG},${bgB})`);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i + 1], b = out[i + 2];
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    if (dist < threshold) out[i + 3] = 0;
  }
  const tmpPath = filePath + ".tmp.png";
  await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(tmpPath);
  fs.renameSync(tmpPath, filePath);
  console.log(`  BG removed: ${filename}`);
}

async function main() {
  // 1) Anime avatar logo
  await generateImage(
    "Create a cute anime chibi girl avatar icon, pixel art style, 128x128 pixels. She has short green glowing hair (#39ff14), dark outfit, holding a glowing green share/download arrow icon. Big expressive eyes, kawaii style. Solid white (#FFFFFF) background. Clean pixel art edges, 8-bit retro game sprite aesthetic. No text.",
    "logo.png"
  );
  await removeBg("logo.png");

  // 2) OG banner image for social media sharing (1200x630)
  await generateImage(
    "Create a wide banner image (1200x630 pixels) for a retro pixel art file sharing website called 'VerShare'. Dark navy background (#0a0a1a) with a subtle green grid. Center: a cute anime chibi pixel art girl with green glowing hair next to large pixel text 'VERSHARE' in bright green (#39ff14). Below: small text 'share text · code · files · images'. Retro 8-bit aesthetic with CRT glow effects. The whole image should be dark themed.",
    "og-banner.png"
  );

  console.log("\nDone!");
}

main().catch(console.error);
