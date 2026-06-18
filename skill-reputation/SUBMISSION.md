# DoraHacks Submission Checklist

## Automated (run now)

```bash
cd skill-reputation
npm install
npm run strategy:all
npm run replay
npm run export:skills
npm run verify
```

## Files to upload / link

- GitHub: `https://github.com/Demiladepy/openskill`
- Demo video (see `DEMO.md`)
- `skills/cmc-strategy-*/SKILL.md`
- `examples/cmc-strategy-skills.zip`
- `replay/output/replay_report.html`
- BscScan attestation tx (after you run `npm run attest`)
- ERC-8004: [testnet.8004scan.io](https://testnet.8004scan.io/) agent link after `npm run agent:register`
- **MCP:** `npm run mcp:forge` + `forge-mcp-config.json` + `bnb-mcp-config.json`

## BAP-692 layer checklist

| Layer | Standard | Forge Skills proof | Command |
|-------|----------|-------------------|---------|
| Identity & trust | ERC-8004 | Agent registration + attestation | `npm run agent:register` · `npm run attest` |
| Capability | Agent Skills + MCPs | CMC SKILL.md + Forge/CMC/TWAK/BNB MCP | `npm run mcp:forge` · `npm run export:skills` |
| Commerce | ERC-8183 | Backtest job server (HTTP demo) | `npm run marketplace:post` |
| Payments | x402 + MPP | HTTP 402 stub on agent server | `X402_DEMO=1` + POST `/api/jobs` |
| Memory | BNB Greenfield | Artifact manifest (roadmap) | `npm run greenfield:pin` |

**Pitch:** Track 2 research layer on BNB agent stack — simulation only, no live trading.

## Cursor MCP (Forge Skills)

Add to Cursor → Settings → MCP (adjust `cwd` to your clone):

```json
{
  "mcpServers": {
    "forge-skills": {
      "command": "node",
      "args": ["scripts/forgeMcpServer.js"],
      "cwd": "/absolute/path/to/skill-reputation"
    }
  }
}
```

Tools: `forge_list_skills`, `forge_get_backtest`, `forge_get_signals`, `forge_verify_submission`, `forge_agent_status`, `forge_bnb_stack`.

## Agent server (Render + local fallback)

- **Primary:** Deploy per [`bnbagent/RENDER_DEPLOY.md`](./bnbagent/RENDER_DEPLOY.md) → set `AGENT_PUBLIC_URL` → `npm run agent:register`
- **Fallback:** `npm run agent:server` locally (+ ngrok if needed)

## BNB pitch alignment (Track 2)

- **Identity:** ERC-8004 via `npm run agent:register` (gas-free testnet)
- **Skills + MCP:** CMC official `SKILL.md` + Forge MCP + `@bnb-chain/mcp`
- **Commerce:** ERC-8183 backtest jobs via `marketplace:post`
- **Roadmap:** x402 payment stub, Greenfield pin script
- **Founder themes:** portable on-chain identity, agent payments >> human payments, BSC #1 ERC-8004 network

## Deadline

June 21, 2026 — 12:00 UTC
