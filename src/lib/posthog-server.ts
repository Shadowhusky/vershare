import { PostHog } from "posthog-node";
import { getCloudflareContext } from "@opennextjs/cloudflare";

let posthogClient: PostHog | null = null;

export function getPostHogClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

// Workers cancel in-flight promises once the response is sent — without
// waitUntil, captured server events silently never leave the isolate.
// Call after capture()/identify() in route handlers.
export function flushPostHog(): void {
  const client = posthogClient;
  if (!client) return;
  try {
    const { ctx } = getCloudflareContext();
    ctx.waitUntil(client.flush());
  } catch {
    // next dev on Node — no Workers context, a floating flush is fine
    client.flush().catch(() => {});
  }
}
