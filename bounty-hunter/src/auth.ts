export type Role = "operator" | "reviewer";

export function requireRole(req: Request, allowed: Role[]) {
  const token = process.env.APP_API_TOKEN;
  if (!token) return null;

  const provided = req.headers.get("x-api-token");
  if (provided !== token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const role = (req.headers.get("x-role") || "operator") as Role;
  if (!allowed.includes(role)) {
    return new Response(JSON.stringify({ error: "Forbidden for current role" }), { status: 403 });
  }

  return null;
}
