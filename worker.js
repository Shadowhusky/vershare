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

export default {
  fetch: openNextWorker.fetch,
  async scheduled(event, env, ctx) {
    ctx.waitUntil(purgeExpiredShares(env));
  },
};
