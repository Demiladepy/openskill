#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/bnbagent"

echo "=== BNB AI Agent SDK Demo ==="
echo "Step 1: Register agent on BSC testnet..."
python register_agent.py --live

echo "Step 2: Start agent server..."
python agent_server.py &
SERVER_PID=$!
sleep 3

echo "Step 3: Post backtest job..."
python marketplace_client.py --strategy momentum --asset BTC --from 2026-03-01 --to 2026-06-01

echo "Step 4: Verify registration + job..."
node verify_job.js

kill "$SERVER_PID" 2>/dev/null || true
echo "=== Demo complete ==="
