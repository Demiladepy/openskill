import { requireRole } from "@/src/auth";
import { q } from "@/src/db/db";

export async function GET(req: Request) {
  const authErr = requireRole(req, ["operator", "reviewer"]);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const rows = q.listBounties.all(status || null);
  return new Response(JSON.stringify({ runs: rows }), {
    headers: { "Content-Type": "application/json" }
  });
}
