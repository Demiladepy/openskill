# Agent notes

## Coding tasks (OpenClaw + gstack)

When spawning Claude Code sessions for coding work in this repository, **load gstack** and use its slash commands:

- Plan before large builds: **Load gstack. Run `/autoplan`** — save the plan; implement from it.
- Ship quality: **Load gstack. Run `/review`** before merging or releasing.
- Web research: use **`/browse`** from gstack instead of ad-hoc browser automation tools.

Attestations and keys live only in `.env` files (never commit). See [README.md](README.md).
