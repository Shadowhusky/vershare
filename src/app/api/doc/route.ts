import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/url";

export async function GET(request: NextRequest) {
  const base = await getBaseUrl();
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");

  const overview = {
    name: "VerShare",
    description: "Free, fast and simple file sharing. Share text, markdown, code, files, and images via web UI, API, or P2P.",
    modes: {
      server: "Content saved on disk, permanent shortlink at /s/{id}",
      p2p: "Direct browser-to-browser via WebRTC, zero server storage, link at /p/{peerId}",
    },
    supported_types: ["text", "markdown", "code", "file", "image"],
    links: {
      home: base,
      api_docs: `${base}/api/doc`,
      web_docs: `${base}/doc`,
    },
  };

  const api = {
    base_url: base,
    endpoints: [
      {
        method: "POST",
        path: "/api/shares",
        description: "Create a new share. Returns a shortlink.",
        content_type: "application/json (text/md/code) or multipart/form-data (file/image)",
        parameters: {
          type: { required: true, values: ["text", "markdown", "code", "file", "image"] },
          content: { required: "for text/markdown/code", type: "string" },
          title: { required: false, type: "string" },
          language: { required: false, type: "string", note: "For code type. e.g. javascript, python" },
          file: { required: "for file/image", type: "binary (multipart)" },
        },
        example_request: {
          url: `${base}/api/shares`,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { type: "text", content: "Hello world!", title: "My note" },
        },
        example_response: {
          id: "aBcDeFgHiJ",
          type: "text",
          title: "My note",
          createdAt: "2026-03-17T12:00:00.000Z",
          url: `${base}/s/aBcDeFgHiJ`,
          raw: `${base}/api/shares/aBcDeFgHiJ/raw`,
          api: `${base}/api/shares/aBcDeFgHiJ`,
        },
      },
      {
        method: "GET",
        path: "/api/shares",
        description: "List all shares, newest first. Supports pagination.",
        parameters: {
          limit: { required: false, type: "number", default: 20, max: 100 },
          offset: { required: false, type: "number", default: 0 },
        },
        example_request: { url: `${base}/api/shares?limit=10&offset=0` },
        example_response: {
          shares: [{ id: "...", type: "text", title: "...", createdAt: "...", url: "...", raw: "..." }],
          count: 1,
          limit: 10,
          offset: 0,
        },
      },
      {
        method: "GET",
        path: "/api/shares/:id",
        description: "Get full metadata for a share. Includes inline content for text types.",
        example_request: { url: `${base}/api/shares/aBcDeFgHiJ` },
        example_response: {
          id: "aBcDeFgHiJ",
          type: "text",
          content: "Hello world!",
          title: "My note",
          createdAt: "...",
          url: `${base}/s/aBcDeFgHiJ`,
          raw: `${base}/api/shares/aBcDeFgHiJ/raw`,
        },
      },
      {
        method: "GET",
        path: "/api/shares/:id/raw",
        description: "Get raw content. Returns text/plain for text shares, binary with correct MIME type for files/images. Ideal for piping or downloading.",
        example_request: { url: `${base}/api/shares/aBcDeFgHiJ/raw` },
        example_response: "Raw content body (not JSON)",
      },
    ],
    errors: {
      "400": "Bad request - missing or invalid parameters",
      "404": "Share not found",
      "500": "Server error",
      format: { error: "error message string" },
    },
    limits: {
      text_markdown_code: "5 MB",
      images: "20 MB",
      files: "50 MB",
    },
  };

  const cli = {
    description: "Shell function for sharing from the command line",
    prerequisites: ["curl", "jq"],
    function: `vershare() {\n  local BASE="${base}"\n  if [ -f "$1" ]; then\n    local mime=$(file -b --mime-type "$1")\n    local type="file"\n    [[ "$mime" == image/* ]] && type="image"\n    curl -s -X POST "$BASE/api/shares" -F "type=$type" -F "file=@$1" | jq -r '.url'\n  elif [ -n "$1" ]; then\n    curl -s -X POST "$BASE/api/shares" -H 'Content-Type: application/json' -d "$(jq -nc --arg c "$1" '{type:\"text\",content:$c}')" | jq -r '.url'\n  else\n    local content=$(cat)\n    curl -s -X POST "$BASE/api/shares" -H 'Content-Type: application/json' -d "$(jq -nc --arg c "$content" '{type:\"text\",content:$c}')" | jq -r '.url'\n  fi\n}`,
    examples: [
      { description: "Share a file", command: "vershare report.pdf" },
      { description: "Share an image", command: "vershare screenshot.png" },
      { description: "Share text", command: 'vershare "hello world"' },
      { description: "Pipe stdin", command: 'echo "data" | vershare' },
      { description: "Clipboard (macOS)", command: "pbpaste | vershare" },
    ],
  };

  const p2p = {
    description: "Direct browser-to-browser file transfer via WebRTC. No server storage.",
    protocol: "PeerJS (WebRTC DataChannel)",
    flow: [
      "Sender fills content and clicks P2P DROP",
      "Unique peer link generated: /p/{peerId}",
      "Sender shares link and keeps tab open",
      "Receiver opens link, connects directly to sender",
      "Data streams peer-to-peer in 16KB base64 chunks",
      "Receiver views/downloads. No server copy exists.",
    ],
    notes: [
      "Sender must keep tab open during transfer",
      "Both browsers must support WebRTC",
      "Link expires when sender closes tab",
      "No server-side file size limits",
    ],
  };

  // Return specific section or all
  if (section) {
    const sections: Record<string, unknown> = { overview, api, cli, p2p };
    if (sections[section]) {
      return NextResponse.json(sections[section]);
    }
    return NextResponse.json({ error: `Unknown section: ${section}. Valid: overview, api, cli, p2p` }, { status: 400 });
  }

  return NextResponse.json({ overview, api, cli, p2p });
}
