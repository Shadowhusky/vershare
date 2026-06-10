import sharp from "sharp";
import * as path from "node:path";
import * as fs from "node:fs";

const ASSETS_DIR = path.join(process.cwd(), "public", "assets");

async function removeDarkBackground(inputFile) {
  const outputFile = inputFile; // overwrite
  const img = sharp(inputFile);
  const { width, height, channels } = await img.metadata();

  const raw = await img.ensureAlpha().raw().toBuffer();

  // Remove dark pixels (close to the dark background color #0a0a1a / #060612)
  const out = Buffer.from(raw);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];

    // If pixel is very dark (background), make transparent
    if (r < 30 && g < 30 && b < 40) {
      out[i + 3] = 0; // set alpha to 0
    }
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputFile + ".tmp");

  fs.renameSync(outputFile + ".tmp", outputFile);
  console.log(`Processed: ${path.basename(inputFile)}`);
}

async function main() {
  const files = ["logo.png", "favicon.png", "hero-floppy.png", "corner-bracket.png"];

  for (const file of files) {
    const filePath = path.join(ASSETS_DIR, file);
    if (fs.existsSync(filePath)) {
      await removeDarkBackground(filePath);
    }
  }

  console.log("Done! Backgrounds removed.");
}

main().catch(console.error);
