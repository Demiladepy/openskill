# BNB AI Agent SDK Integration

On-chain agent identity (ERC-8004) and agentic commerce (ERC-8183) for **CMC Strategy Forge**.

## Setup

```bash
cd skill-reputation
pip install -r bnbagent/requirements.txt
cp bnbagent/.env.agent.example bnbagent/.env.agent
```

## Demo flow (no private keys)

```bash
# 1. Register agent (simulate mode)
npm run agent:register

# 2. Start agent server (terminal A)
npm run agent:server

# 3. Post a backtest job (terminal B)
npm run marketplace:post -- --strategy momentum --from 2026-06-01 --to 2026-06-21 --reward 10

# 4. Verify job result
npm run marketplace:verify -- --job-id <jobId from step 3>
```

## Live BSC Testnet (special prize)

Set in `bnbagent/.env.agent`:

- `AGENT_SIMULATE=0`
- `AGENT_PRIVATE_KEY` (throwaway testnet wallet)
- `WALLET_PASSWORD=local-dev-only` (or your keystore password)

```bash
python register_agent.py --live
# → agent ID + https://testnet.bscscan.com/tx/0x...

npm run agent:server
python marketplace_client.py --strategy momentum --asset BTC
node verify_job.js
```

One-command demo: `bash demo.sh`

## Public deployment (optional — Render, later)

Default hackathon path: **GitHub** for skills/MCP/docs in `agentURI`, **local** for ERC-8183 jobs.

See [`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md) when you want a hosted job server URL.

Optional stretch: `--onchain` job posting via ERC-8183Client (requires `CLIENT_PRIVATE_KEY`).

## Architecture

| Module | Role |
|--------|------|
| `register.js` / `register_agent.py` | ERC-8004 agent NFT + metadata |
| `agent_server.py` | FastAPI + `create_erc8183_app` job handler |
| `marketplace_client.py` | Post jobs (HTTP demo or on-chain) |
| `run_backtest.js` | Node CLI calling `runBacktestJob()` |
| `verify_job.js` | Job status for judges |

Jobs run **simulation-only** backtests via CoinMarketCap data — no live trading.

## Official contracts (BSC Testnet)

| Contract | Address |
|----------|---------|
| ERC-8004 Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| AgenticCommerce | `0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de` |
| EvaluatorRouter | `0xd7d36d66d2f1b608a0f943f722d27e3744f66f25` |
| OptimisticPolicy | `0x4f4678d4439fec812ac7674bb3efb4c8f5fb78a6` |
