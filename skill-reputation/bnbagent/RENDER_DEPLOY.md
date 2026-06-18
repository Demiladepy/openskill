# Deploy ERC-8183 Agent Server on Render

Public URL for ERC-8004 `agentURI` and ERC-8183 job demos. Use **local fallback** when Render billing fails.

## Quick deploy

1. Create a **Web Service** on [Render](https://render.com) from this repo.
2. Set **Root Directory** to `skill-reputation`.
3. Use the settings in [`render.yaml`](./render.yaml) or configure manually:

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
AGENT_PORT=10000
AGENT_PUBLIC_URL=https://YOUR-SERVICE.onrender.com/erc8183/status
AGENT_FALLBACK_URL=http://localhost:8000/erc8183/status
AGENT_DOCS_URL=https://YOUR-VERCEL-APP.vercel.app
```

Render sets `PORT` 
` — `agent_server.py` reads `AGENT_PORT` or defaults to 8000. On Render, set:

```
AGENT_PORT=$PORT
```

Or update `agent_server.py` to prefer `PORT` env (already uses `AGENT_PORT`; add `os.getenv("PORT", ...)` if needed).

## After deploy

1. Copy Render URL into `bnbagent/.env.agent`:
   ```
   AGENT_PUBLIC_URL=https://YOUR-SERVICE.onrender.com/erc8183/status
   ```
2. Re-register on-chain:
   ```bash
   npm run agent:register
   ```
3. Test job:
   ```bash
   npm run marketplace:post -- --strategy regime --asset BTC
   ```

## Fallback when Render card fails

| Surface | Works offline? |
|---------|----------------|
| Forge MCP (`npm run mcp:forge`) | Yes |
| Vercel docs UI | Yes |
| ERC-8004 identity (local register) | Yes |
| ERC-8183 jobs | Local only: `npm run agent:server` + optional ngrok |

```bash
npm run agent:server
# optional: ngrok http 8000 → set AGENT_PUBLIC_URL to ngrok URL → npm run agent:register
```

## x402 payments demo (roadmap)

On the agent server:

```bash
X402_DEMO=1 python bnbagent/agent_server.py
curl -X POST http://localhost:8000/api/jobs -H "Content-Type: application/json" -d "{}"
# Returns HTTP 402 with payment stub JSON
```
