import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "assets", "screenshots");

async function main() {
  const browser = await chromium.launch();

  // Desktop screenshots
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  // Home page
  const homePage = await desktop.newPage();
  await homePage.goto("http://localhost:7749", { waitUntil: "networkidle" });
  await homePage.waitForTimeout(1000);
  await homePage.screenshot({ path: path.join(outDir, "home.png"), fullPage: false });
  console.log("home.png");

  // Create a test share for the view page
  const res = await fetch("http://localhost:7749/api/shares", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "code",
      title: "Hello World",
      content: `function greet(name) {\n  console.log(\`Hello, \${name}!\`);\n  return { message: \`Welcome to VerShare\` };\n}\n\ngreet("World");`,
      language: "javascript",
    }),
  });
  const share = await res.json();

  // Share view page
  const viewPage = await desktop.newPage();
  await viewPage.goto(`http://localhost:7749/s/${share.id}`, { waitUntil: "networkidle" });
  await viewPage.waitForTimeout(1000);
  await viewPage.screenshot({ path: path.join(outDir, "share-view.png"), fullPage: false });
  console.log("share-view.png");

  // Mobile screenshot
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
  });

  const mobilePage = await mobile.newPage();
  await mobilePage.goto("http://localhost:7749", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(outDir, "mobile.png"), fullPage: false });
  console.log("mobile.png");

  await browser.close();
  console.log("Done!");
}

main().catch(console.error);
