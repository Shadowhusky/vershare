import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ASSETS_DIR = path.join(process.cwd(), "public", "assets");

async function generateImage(prompt, filename) {
  console.log(`Generating: ${filename}...`);
  try {
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
    console.log(`  No image in response for ${filename}`);
    return false;
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    return false;
  }
}

async function removeBg(filename, threshold = 35) {
  const filePath = path.join(ASSETS_DIR, filename);
  const img = sharp(filePath);
  const { width, height } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();
  const out = Buffer.from(raw);

  // Sample corner pixels to detect background color
  const bgR = out[0], bgG = out[1], bgB = out[2];
  console.log(`  BG color detected: rgb(${bgR},${bgG},${bgB})`);

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i + 1], b = out[i + 2];
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    if (dist < threshold) {
      out[i + 3] = 0;
    }
  }

  const tmpPath = filePath + ".tmp.png";
  await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(tmpPath);
  fs.renameSync(tmpPath, filePath);
  console.log(`  Background removed: ${filename}`);
}

async function main() {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  await generateImage(
    "Create a pixel art logo icon for a file sharing app called 'VerShare'. Simple 64x64 pixel art: a green (#39ff14) downward-pointing arrow merged with a share/network symbol. Solid bright white (#FFFFFF) background. Clean pixel edges, 8-bit retro game style, minimal. No text in the image.",
    "logo.png"
  );

  await generateImage(
    "Create a 32x32 pixel art favicon icon. A simple green (#39ff14) share arrow pointing down on solid white (#FFFFFF) background. Minimal pixel art, 8-bit style, no text, clean edges.",
    "favicon.png"
  );

  await generateImage(
    "Create a pixel art floppy disk icon, 128x128 pixels. Dark gray floppy with bright green (#39ff14) neon glow outline and accents. Solid white (#FFFFFF) background. 8-bit retro pixel art style, clean edges.",
    "hero-floppy.png"
  );

  await generateImage(
    "Create a pixel art L-shaped corner bracket decoration, 32x32 pixels. Bright green (#39ff14) pixel art corner bracket on solid white (#FFFFFF) background. 8-bit style, clean pixel edges.",
    "corner-bracket.png"
  );

  // Remove white backgrounds
  console.log("\nRemoving backgrounds...");
  for (const f of ["logo.png", "favicon.png", "hero-floppy.png", "corner-bracket.png"]) {
    await removeBg(f, 40);
  }

  console.log("\nDone!");
}

main().catch(console.error);
