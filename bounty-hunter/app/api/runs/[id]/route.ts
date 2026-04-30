import { requireRole } from "@/src/auth";
import { q } from "@/src/db/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = requireRole(req, ["operator", "reviewer"]);
  if (authErr) return authErr;

  const { id } = await params;
  const run = q.getBounty.get(id);
  if (!run) {
    return new Response(JSON.stringify({ error: "Run not found" }), { status: 404 });
  }

  const events = q.listRunEvents.all(id);
  return new Response(JSON.stringify({ run, events }), {
    headers: { "Content-Type": "application/json" }
  });
}
