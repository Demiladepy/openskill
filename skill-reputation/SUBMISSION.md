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
- **Live attestation:** [BscScan](https://testnet.bscscan.com/tx/0xe8870d221a00532e9320bd69f10ac533911c752491ba4d183931ee6c03970753)
- **Live ERC-8004:** Agent **1460** · [8004scan](https://testnet.8004scan.io/agent/1460) · [registration tx](https://testnet.bscscan.com/tx/0x1544ee04b206db1c8a3e8e66d5d0eb393bc73aa0fd29181d83efdfc94000d413)
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

## Agent server (GitHub first — Render optional later)

1. **Push to GitHub** — judges clone `https://github.com/Demiladepy/openskill`
2. **Register ERC-8004** with GitHub discovery URLs (default):
   ```bash
   cp bnbagent/.env.agent.example bnbagent/.env.agent
   # AGENT_DISCOVERY_MODE=github (default) — no AGENT_PUBLIC_URL needed
   npm run agent:register
   ```
3. **Commerce demo (local):** `npm run agent:server` + `npm run marketplace:post`
4. **Later (optional):** Render deploy → set `AGENT_PUBLIC_URL` → re-register — see [`bnbagent/RENDER_DEPLOY.md`](./bnbagent/RENDER_DEPLOY.md)

## BNB pitch alignment (Track 2)

- **Identity:** ERC-8004 via `npm run agent:register` (gas-free testnet)
- **Skills + MCP:** CMC official `SKILL.md` + Forge MCP + `@bnb-chain/mcp`
- **Commerce:** ERC-8183 backtest jobs via `marketplace:post`
- **Roadmap:** x402 payment stub, Greenfield pin script
- **Founder themes:** portable on-chain identity, agent payments >> human payments, BSC #1 ERC-8004 network

## Deadline

June 21, 2026 — 12:00 UTC
