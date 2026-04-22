---
name: skill-reputation
description: Inventory local OpenClaw skills, append a behavior log, and attest scores on Base Sepolia.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - BASE_SEPOLIA_RPC_URL
        - SKILL_REPUTATION_CONTRACT
        - ATTESTOR_PRIVATE_KEY
      bins:
        - node
    primaryEnv: ATTESTOR_PRIVATE_KEY
---

# SkillReputation

This folder is an **OpenClaw skill extension** (a small **agent plugin**): it teaches the model how to **scan installed skills**, **inspect the local reputation log**, and **post an on-chain attestation** on Base Sepolia when the user explicitly asks. The **SkillReputation** monorepo’s top-level `README.md` has the full operator’s guide, trust model, and install paths (if you copied only this folder, open the README from the full checkout).

## Paths

Scripts live under `{baseDir}/scripts/`. Run them with `node` from the skill root `{baseDir}` (or use `npm run scan` / `npm run attest` after `npm install`).

## Workflow

1. **Configure once**: Copy `{baseDir}/.env.example` to `{baseDir}/.env`. Set `BASE_SEPOLIA_RPC_URL`, `SKILL_REPUTATION_CONTRACT`, and `ATTESTOR_PRIVATE_KEY`. Never commit `.env` or paste keys into chat.
2. **Scan**: After installs or when the user asks for an inventory, run:

   `node {baseDir}/scripts/scanner.js`

   Optional: `node {baseDir}/scripts/scanner.js --roots "C:\\path\\to\\skills;~/.openclaw/skills"`  
   Optional log path: `SKILL_REPUTATION_LOG` or `--out path/to/behavior-log.jsonl`

3. **Attest** (only when the user explicitly asks to record a score on-chain): Run:

   `node {baseDir}/scripts/attest.js --skill <normalized-or-display-name> --score <0-100>`

   If the skill was never scanned, use a file path:

   `node {baseDir}/scripts/attest.js --skill @{absolutePath}/SKILL.md --score <0-100>`

   The latest **scan** line in the log supplies the `digest` commitment sent with the transaction.

## Optional manual events

Agents may append JSONL lines to the same log file (e.g. `{"type":"invocation","skillName":"foo","note":"...","ts":"..."}`) for future digest upgrades. The MVP `digest` is still derived from the last `scan` snapshot.

## Security

- Treat `ATTESTOR_PRIVATE_KEY` as a hot wallet with minimal Sepolia ETH.
- Do not embed private keys or RPC secrets in `SKILL.md`.
