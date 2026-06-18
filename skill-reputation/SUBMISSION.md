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
- **Optional wow:** Forge MCP — `npm run mcp:forge` + `forge-mcp-config.json` in Cursor

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

Tools: `forge_list_skills`, `forge_get_backtest`, `forge_get_signals`, `forge_verify_submission`.

## BNB pitch alignment (Track 2)

- **Identity:** ERC-8004 via `npm run agent:register` (gas-free testnet; you sent wallet to Gwen — good)
- **Skills + MCP:** CMC official `SKILL.md` format + Forge MCP + optional CMC/TWAK/BNB MCPs
- **Commerce layer (roadmap):** BAP-692 BNBAgent SDK — ERC-8183 jobs/escrow; Forge is research/simulation, not live commerce
- **Founder themes to echo:** agents need portable on-chain identity (ERC-8004), agent payments >> human payments (CZ), BSC as #1 ERC-8004 deployment network

## Deadline

June 21, 2026 — 12:00 UTC
