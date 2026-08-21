import { runBillingSweep } from "@/lib/billing";

/**
 * Daily billing sweep, invoked by a Railway cron job:
 *
 *   curl -fsS -H "x-cron-secret: $CRON_SECRET" https://<app>/api/cron/billing
 *
 * Idempotent, so a retried or double-fired job is harmless.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  // Timing-safe enough for a fixed-length shared secret compared as bytes.
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (provided.length !== secret.length || provided !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runBillingSweep();
  return Response.json({ ok: true, ...result });
}

// Some cron providers only issue GETs; the secret is what authorizes, not the verb.
export const GET = POST;
