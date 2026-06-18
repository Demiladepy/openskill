import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const runtime = "nodejs";

function repoRoot(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");
}

function runPythonBin(bin: string, question: string, root: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ["-m", "ask_docs", question], {
      cwd: root,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `${bin} exited ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()) as Record<string, unknown>);
      } catch {
        reject(new Error(`Invalid JSON from ask_docs`));
      }
    });
  });
}

async function askPython(question: string, root: string): Promise<Record<string, unknown>> {
  try {
    return await runPythonBin("python", question, root);
  } catch {
    return runPythonBin("python3", question, root);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const question = String((body as { question?: string }).question || "").trim();

    if (!question) {
      return NextResponse.json({ ok: false, error: "Question required" }, { status: 400 });
    }

    const root = repoRoot();

    try {
      const result = await askPython(question, root);
      return NextResponse.json({ ...result, engine: "python" });
    } catch (pyErr) {
      const { askDocsFallback } = await import("../../lib/askDocsFallback");
      const result = askDocsFallback(question, root);
      return NextResponse.json({
        ...result,
        engine: "typescript-fallback",
        pythonError: pyErr instanceof Error ? pyErr.message : String(pyErr),
      });
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Ask Docs failed" },
      { status: 500 }
    );
  }
}
