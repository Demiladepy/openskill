import { NextResponse } from "next/server";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const strategy = (body as { strategy?: string }).strategy || "momentum";
    const fromScan = (body as { fromScan?: boolean }).fromScan === true;

    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");
    const { exportCmcSkill, exportFromScan } = await import(
      path.join(root, "marketplace", "exporter.js")
    );

    const result = fromScan ? await exportFromScan() : await exportCmcSkill(strategy);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
