import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

export async function getFilesBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  return env.FILES;
}
