#!/usr/bin/env python3
"""ERC-8183 agent server — accepts jobs, runs CMC backtests, submits deliverables."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

ROOT = Path(__file__).resolve().parent.parent
STATE_PATH = Path(__file__).resolve().parent / "agent_state.json"
RUN_BACKTEST = Path(__file__).resolve().parent / "run_backtest.js"

job_results: dict[str, Any] = {}


def load_env() -> None:
    for candidate in (
        ROOT / "bnbagent" / ".env.agent",
        ROOT / "skill" / ".env",
        ROOT / ".env",
    ):
        if candidate.exists():
            load_dotenv(candidate, override=False)


def read_state() -> dict:
    if not STATE_PATH.exists():
        return {}
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def append_job_record(record: dict) -> None:
    state = read_state()
    jobs = state.get("jobs", [])
    jobs.append(record)
    state["jobs"] = jobs[-50:]
    STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def parse_job_params(job: dict) -> dict:
    raw = job.get("data", {}).get("parameters") or job.get("description") or job.get("parameters") or {}
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            raw = {"strategy": "momentum", "from": "2026-06-01", "to": "2026-06-21", "note": raw}
    return {
        "strategy": raw.get("strategy", "momentum"),
        "from": raw.get("from", "2026-06-01"),
        "to": raw.get("to", "2026-06-21"),
        "symbol": raw.get("symbol", "BNB"),
    }


def run_backtest_cli(params: dict) -> dict:
    env = {**os.environ}
    if not env.get("CMC_API_KEY"):
        env.setdefault("CMC_USE_MOCK", "1")

    proc = subprocess.run(
        [
            "node",
            str(RUN_BACKTEST),
            "--strategy",
            params["strategy"],
            "--from",
            params["from"],
            "--to",
            params["to"],
            "--output",
            "job-format",
            "--symbol",
            params.get("symbol", "BNB"),
        ],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
        env=env,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or proc.stdout or "backtest failed")
    return json.loads(proc.stdout)


def execute_job(job: dict) -> str:
    """ERC-8183 on_job callback — return deliverable JSON string."""
    params = parse_job_params(job)
    result = run_backtest_cli(params)
    job_id = str(job.get("jobId") or job.get("job_id") or uuid.uuid4())
    job_results[job_id] = result
    append_job_record(
        {
            "jobId": job_id,
            "status": "COMPLETED",
            "strategy": params["strategy"],
            "result": result,
            "mode": os.getenv("AGENT_SIMULATE", "0"),
        }
    )
    return json.dumps(result)


load_env()
erc8183_app = None
_has_wallet = bool(
    os.getenv("AGENT_PRIVATE_KEY")
    or os.getenv("PRIVATE_KEY")
    or os.getenv("WALLET_PASSWORD")
    or os.getenv("TWAK_UNLOCK_PASSPHRASE")
)
if _has_wallet and os.getenv("AGENT_SIMULATE", "0") != "1":
    try:
        from bnbagent.erc8183.server import create_erc8183_app

        erc8183_app = create_erc8183_app(on_job=execute_job, prefix="")
    except Exception as exc:  # noqa: BLE001
        print(f"ERC-8183 server disabled: {exc}", file=sys.stderr)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if erc8183_app is not None:
        await erc8183_app.state.startup()
    yield


app = FastAPI(
    title="CMC Strategy Forge Agent",
    description="ERC-8183 provider — backtest-only strategy validation",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    state = read_state()
    return {
        "status": "ok",
        "agent_id": state.get("agentId") or state.get("agent_id"),
        "erc8183_mounted": erc8183_app is not None,
        "simulation_only": True,
    }


@app.post("/api/jobs")
async def accept_job(job: dict, request: Request):
    """HTTP job intake (demo + agent hub compatibility)."""
    if os.getenv("X402_DEMO", "0") == "1":
        price = os.getenv("X402_DEMO_PRICE", "1000000")
        token = os.getenv("X402_DEMO_TOKEN", "U")
        return JSONResponse(
            status_code=402,
            content={
                "error": "payment_required",
                "x402": "roadmap",
                "message": "Backtest-as-a-service micropayment stub (BAP-692 payments layer).",
                "price_wei": price,
                "token": token,
                "simulation_only": True,
                "hint": "Set X402_DEMO=0 to run jobs without payment demo.",
            },
        )

    job_id = str(job.get("jobId") or job.get("job_id") or uuid.uuid4())
    try:
        params = parse_job_params(job)
        result = run_backtest_cli(params)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    job_results[job_id] = result
    append_job_record(
        {
            "jobId": job_id,
            "status": "COMPLETED",
            "strategy": params["strategy"],
            "result": result,
            "mode": "http",
        }
    )
    return {"status": "completed", "jobId": job_id, "result": result}


@app.get("/api/jobs/{job_id}/result")
def get_result(job_id: str):
    result = job_results.get(job_id)
    if not result:
        state = read_state()
        for row in reversed(state.get("jobs", [])):
            if str(row.get("jobId")) == job_id:
                return row.get("result") or row
    if not result:
        raise HTTPException(status_code=404, detail="Job not found")
    return result


if erc8183_app is not None:
    app.mount("/erc8183", erc8183_app)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT") or os.getenv("AGENT_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
