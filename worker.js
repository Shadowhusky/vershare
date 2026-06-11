// Wraps the OpenNext worker to add a scheduled purge of shares whose
// 30-day post-expiry recovery window has passed. Past that point the
// content is gone for good.
import openNextWorker from "./.open-next/worker.js";
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

async function purgeExpiredShares(env) {
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  const { results } = await env.DB.prepare(
    "SELECT id, file_name FROM shares WHERE expires_at IS NOT NULL AND expires_at < ? LIMIT 200"
  )
    .bind(cutoff)
    .all();

  let purged = 0;
  for (const row of results) {
    const keys = [`content/${row.id}`];
    const uploads = await env.FILES.list({ prefix: `uploads/${row.id}/` });
    keys.push(...uploads.objects.map((o) => o.key));
    await env.FILES.delete(keys);
    await env.DB.prepare("DELETE FROM upload_history WHERE share_id = ?").bind(row.id).run();
    await env.DB.prepare("DELETE FROM shares WHERE id = ?").bind(row.id).run();
    purged++;
  }
  console.log(`purge: removed ${purged} shares past the recovery window`);
  return purged;
}

// Abandoned multipart uploads keep billing for their parts until aborted.
const PENDING_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

async function abortStaleUploads(env) {
  const cutoff = new Date(Date.now() - PENDING_UPLOAD_TTL_MS).toISOString();
  const { results } = await env.DB.prepare(
    "SELECT id, r2_key, upload_id FROM pending_uploads WHERE created_at < ? LIMIT 200"
  )
    .bind(cutoff)
    .all();

  for (const row of results) {
    try {
      await env.FILES.resumeMultipartUpload(row.r2_key, row.upload_id).abort();
    } catch {
      // already gone on the R2 side
    }
    await env.DB.prepare("DELETE FROM pending_uploads WHERE id = ?").bind(row.id).run();
  }
  if (results.length) console.log(`purge: aborted ${results.length} stale uploads`);
}

// History/seen rows whose share no longer exists would resurrect deleted
// drops in the sidebar lists.
async function sweepOrphanRows(env) {
  await env.DB.prepare(
    "DELETE FROM upload_history WHERE share_id NOT IN (SELECT id FROM shares)"
  ).run();
  await env.DB.prepare(
    "DELETE FROM seen_shares WHERE share_id NOT IN (SELECT id FROM shares)"
  ).run();
}

// Serve file/image downloads natively — the OpenNext bridge truncates large
// streamed bodies, and a direct R2 stream is faster anyway. Returns null for
// anything that isn't a healthy file share so Next keeps its 404/410 JSON.
const RAW_PATH = /^\/api\/shares\/([A-Za-z0-9_-]+)\/raw\/?$/;

async function serveFileRaw(request, env, id) {
  const row = await env.DB.prepare(
    "SELECT id, type, file_name, mime_type, expires_at FROM shares WHERE id = ?"
  )
    .bind(id)
    .first();
  if (!row || !row.file_name) return null;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;

  const key = `uploads/${row.id}/${row.file_name}`;
  const mime = row.mime_type || "application/octet-stream";
  const inlineable =
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime === "application/pdf" ||
    mime === "text/html";

  const headers = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
  };
  if (row.type === "file" && !inlineable) {
    headers["Content-Disposition"] = `attachment; filename="${row.file_name}"`;
  }

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const m = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (m) {
      const head = await env.FILES.head(key);
      if (!head) return null;
      const start = parseInt(m[1], 10);
      const end = m[2] ? Math.min(parseInt(m[2], 10), head.size - 1) : head.size - 1;
      if (start >= head.size || start > end) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${head.size}` },
        });
      }
      const length = end - start + 1;
      const obj = await env.FILES.get(key, { range: { offset: start, length } });
      if (!obj) return null;
      return new Response(obj.body, {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${start}-${end}/${head.size}`,
          "Content-Length": String(length),
        },
      });
    }
  }

  const obj = await env.FILES.get(key);
  if (!obj) return null;
  return new Response(obj.body, {
    status: 200,
    headers: { ...headers, "Content-Length": String(obj.size), ETag: obj.httpEtag },
  });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "GET") {
      const m = new URL(request.url).pathname.match(RAW_PATH);
      if (m) {
        const direct = await serveFileRaw(request, env, m[1]);
        if (direct) return direct;
      }
    }
    return openNextWorker.fetch(request, env, ctx);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      Promise.all([purgeExpiredShares(env), abortStaleUploads(env), sweepOrphanRows(env)])
    );
  },
};
