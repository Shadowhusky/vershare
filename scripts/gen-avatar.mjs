#!/usr/bin/env node
// Generates the default user avatar in the mascot's pixel-chibi style.
// Reads OPENAI_API_KEY from the environment.
import fs from "fs";

const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error("OPENAI_API_KEY not set");
  process.exit(1);
}

const prompt =
  "Pixel art chibi anime character avatar, head-and-shoulders bust portrait, facing forward. " +
  "Cute anime girl with short cyan/teal hair and big sparkly cyan eyes, gentle smile, blush marks. " +
  "Crisp retro pixel-art style with clean black pixel outlines, limited palette, " +
  "matching a retro terminal aesthetic. Dark navy hoodie. " +
  "Centered, iconic, kawaii, suitable as a tiny user avatar icon. " +
  "Plain transparent background.";

async function gen(model) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1024",
      quality: "high",
      background: "transparent",
      n: 1,
    }),
  });
  if (!res.ok) throw new Error(`${model}: ${res.status} ${await res.text()}`);
  return res.json();
}

let data, used;
try {
  data = await gen("gpt-image-2");
  used = "gpt-image-2";
} catch (e) {
  console.error(String(e).slice(0, 200));
  data = await gen("gpt-image-1");
  used = "gpt-image-1";
}

fs.writeFileSync(
  "public/assets/avatar-default.png",
  Buffer.from(data.data[0].b64_json, "base64")
);
console.log(`saved via ${used}`);
