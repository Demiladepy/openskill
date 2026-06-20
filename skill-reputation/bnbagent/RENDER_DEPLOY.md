# Deploy ERC-8183 Agent Server on Render (optional — later)

> **Default for hackathon:** push to **GitHub** and register ERC-8004 with GitHub discovery URLs (`AGENT_DISCOVERY_MODE=github`). Judges clone the repo and run locally. **Render is optional** when you want a public job server URL.

## When to use Render

Use Render **after** GitHub submission when you want:

- A public `AGENT_PUBLIC_URL` for live ERC-8183 job POSTs
- Demo video segment hitting a hosted `/api/jobs` endpoint

Until then, commerce runs locally:

```bash
npm run agent:server
npm run marketplace:post -- --strategy regime --asset BTC
```

## Quick deploy (later)

1. Create a **Web Service** on [Render](https://render.com) from this repo.
2. Set **Root Directory** to `skill-reputation`.
3. Use the settings in [`render.yaml`](../render.yaml) or configure manually:

| Setting | Value |
|---------|--------|
| Build | `pip install -r bnbagent/requirements.txt && npm install` |
| Start | `python bnbagent/agent_server.py` |
| Health check | `/health` |

## Environment variables (Render dashboard)

```
NETWORK=bsc-testnet
AGENT_SIMULATE=0
AGENT_PRIVATE_KEY=<your BSC testnet key>
WALLET_PASSWORD=<keystore password if needed>
CMC_API_KEY=<optional live backtests>
CMC_USE_MOCK=1
AGENT_DISCOVERY_MODE=render
AGENT_PUBLIC_URL=https://YOUR-SERVICE.onrender.com/erc8183/status
AGENT_FALLBACK_URL=http://localhost:8000/erc8183/status
AGENT_DOCS_URL=https://github.com/Demiladepy/openskill
```

The server reads `PORT` from Render automatically (`agent_server.py`).

## After deploy

1. Set `AGENT_PUBLIC_URL` in `bnbagent/.env.agent` to your Render URL.
2. Set `AGENT_DISCOVERY_MODE=render` (or leave `AGENT_PUBLIC_URL` as an `http` URL).
3. Re-register on-chain:
   ```bash
   npm run agent:register
   ```
4. Test job:
   ```bash
   npm run marketplace:post -- --strategy regime --asset BTC
   ```

## GitHub-first (recommended now)

| Surface | Where |
|---------|--------|
| Skills + MCP configs | GitHub raw/tree URLs in `agentURI` |
| Judges verify | `git clone` → `npm run verify` |
| ERC-8183 jobs | Local `npm run agent:server` |
| ERC-8004 register | `npm run agent:register` (no Render needed) |

## x402 payments demo (roadmap)

On the agent server:

```bash
X402_DEMO=1 python bnbagent/agent_server.py
curl -X POST http://localhost:8000/api/jobs -H "Content-Type: application/json" -d "{}"
# Returns HTTP 402 with payment stub JSON
```
