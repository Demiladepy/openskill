import { requireRole } from "@/src/auth";
import { q } from "@/src/db/db";

export async function GET(req: Request) {
  const authErr = requireRole(req, ["operator", "reviewer"]);
  if (authErr) return authErr;

  const contributors = q.listContributors.all();
  return new Response(JSON.stringify({ contributors }), {
    headers: { "Content-Type": "application/json" }
  });
}
