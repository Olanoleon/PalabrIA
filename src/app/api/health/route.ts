import { prisma } from "@/lib/prisma";

/**
 * Railway health check. Touches the database so a deploy that cannot reach Neon
 * fails the check instead of serving broken pages.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[health] database unreachable", error);
    return Response.json({ ok: false, error: "database" }, { status: 503 });
  }
}
