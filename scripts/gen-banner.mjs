import { GoogleGenAI } from "@google/genai";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "public", "assets", "screenshots", "banner.png");

const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function tryGemini() {
  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: `Generate a wide banner image (1280x400) for a GitHub repo called "VerShare".

It's a retro pixel-art file sharing platform. The banner should feature:

- A cute anime-style chibi girl character (green hair, hoodie, pixel-art style) on the left side, similar to a mascot. She should look like she's tossing or dropping a glowing file/document.
- Dark cyberpunk background (#060612) with subtle neon green (#39ff14) grid lines
- Text "VERSHARE" in pixel/retro font with neon green glow on the right side
- Small subtitle "drop anything. share everything." below the title
- A few floating pixel-art icons (file, code brackets {}, image icon) scattered around
- Overall vibe: cute anime meets retro hacker terminal, dark and cozy`,
    config: {
      responseModalities: ["image", "text"],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync(outPath, buffer);
      console.log("Banner generated via Gemini:", outPath);
      return true;
    }
  }
  return false;
}

async function fallbackPlaywright() {
  const html = `<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1280px; height: 640px; background: #060612; font-family: 'Press Start 2P', monospace; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
  body::before { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(57,255,20,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.04) 1px, transparent 1px); background-size: 40px 40px; }
  .c { position: relative; z-index: 1; text-align: center; padding: 60px; }
  .t { color: #39ff14; font-size: 48px; text-shadow: 0 0 20px rgba(57,255,20,0.5), 0 0 60px rgba(57,255,20,0.2); margin-bottom: 24px; letter-spacing: 8px; }
  .s { color: #888899; font-size: 14px; letter-spacing: 4px; margin-bottom: 40px; }
  .tags { display: flex; gap: 16px; justify-content: center; }
  .tag { padding: 8px 16px; border: 2px solid; font-size: 10px; letter-spacing: 2px; }
  .g { color: #39ff14; border-color: rgba(57,255,20,0.3); } .cy { color: #00d4ff; border-color: rgba(0,212,255,0.3); }
  .p { color: #b000ff; border-color: rgba(176,0,255,0.3); } .a { color: #ffb000; border-color: rgba(255,176,0,0.3); }
  .pk { color: #ff6ec7; border-color: rgba(255,110,199,0.3); }
  .corner { position: absolute; color: rgba(57,255,20,0.2); font-size: 24px; }
  .tl { top: 20px; left: 20px; } .tr { top: 20px; right: 20px; } .bl { bottom: 20px; left: 20px; } .br { bottom: 20px; right: 20px; }
</style></head><body>
  <span class="corner tl">+</span><span class="corner tr">+</span><span class="corner bl">+</span><span class="corner br">+</span>
  <div class="c"><div class="t">VERSHARE</div><div class="s">DROP ANYTHING. SHARE EVERYTHING.</div>
  <div class="tags"><span class="tag g">TEXT</span><span class="tag cy">CODE</span><span class="tag p">MARKDOWN</span><span class="tag a">FILES</span><span class="tag pk">P2P</span></div></div>
</body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: outPath });
  await browser.close();
  console.log("Banner generated via Playwright fallback:", outPath);
}

async function main() {
  try {
    const ok = await tryGemini();
    if (ok) return;
  } catch (err) {
    console.log("Gemini failed:", err.message);
  }
  await fallbackPlaywright();
}

main().catch(console.error);
