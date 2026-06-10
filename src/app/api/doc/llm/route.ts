import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/url";

export async function GET() {
  const base = await getBaseUrl();

  const doc = `# VerShare API
Base: ${base}

## Create share
POST ${base}/api/shares
Content-Type: application/json
Body: {"type":"text|markdown|code","content":"...","title":"optional","language":"optional(for code)"}
Response: {"id":"...","url":"${base}/s/{id}","raw":"${base}/api/shares/{id}/raw"}

## Upload file/image
POST ${base}/api/shares
Content-Type: multipart/form-data
Fields: type=file|image, file=@binary, title=optional
Response: same as above

## List shares
GET ${base}/api/shares?limit=20&offset=0
Response: {"shares":[...],"count":N}

## Get share
GET ${base}/api/shares/{id}
Response: full metadata + content

## Get raw content
GET ${base}/api/shares/{id}/raw
Returns: raw text or binary file

## Agent-friendly drop (returns raw URL as plain text)
POST ${base}/api/drop
Body: {"type":"text","content":"..."}
Response: ${base}/api/shares/{id}/raw (plain text URL, not JSON)
?format=view → returns web view URL
?format=json → returns JSON with all links

## Types: text, markdown, code, file, image
## Code languages: javascript, typescript, python, java, c, cpp, go, rust, ruby, php, bash, json, yaml, html, css, sql +more
## Limits: text 5MB, image 20MB, file 50MB
## Errors: {"error":"message"} with 400/404/500
`;

  return new NextResponse(doc, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
