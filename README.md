# matt-daily-skills

Personal skills library. Install with [`vercel-labs/skills`](https://github.com/vercel-labs/skills) — supports 40+ coding agents (Claude Code, Qwen Code, Codex, GitHub Copilot, Cursor, Gemini CLI, and more).

## Installation

```bash
# Interactive — pick which skills and which agent(s)
npx skills add meirongdev/matt-daily-skills

# List what's in the repo without installing
npx skills add meirongdev/matt-daily-skills --list

# Install a specific skill to a specific agent, globally, non-interactive
npx skills add meirongdev/matt-daily-skills -g -a claude-code -s ecommerce-entry-review -y

# Install all skills to Claude Code globally
npx skills add meirongdev/matt-daily-skills --skill '*' -a claude-code -g -y
```

Default install method is symlink — skills update in place when you run `npx skills update`. Pass `--copy` if symlinks aren't supported on your system.

## Installation scope

| Scope | Flag | Where it lands (agent-dependent) |
|---|---|---|
| **Project** (default) | — | e.g. `.claude/skills/`, `.qwen/skills/` |
| **Global** | `-g` | e.g. `~/.claude/skills/`, `~/.qwen/skills/` |

See [`vercel-labs/skills`](https://github.com/vercel-labs/skills) for the full agent → path table and the full flag reference.

## Updating

```bash
# Update every installed skill from this repo
npx skills update

# Update one
npx skills update ecommerce-entry-review
```

## Skills in this repo

- **`ecommerce-entry-review`** — reviews e-commerce product entry drafts against stored style/quality rules and emits a diff.

Run `npx skills add meirongdev/matt-daily-skills --list` for the live list.

## Adding a new skill

```bash
cd skills
npx skills init <new-skill-name>
```

Edit the generated `skills/<new-skill-name>/SKILL.md`:

```markdown
---
name: new-skill-name
description: One paragraph describing when this skill should fire and what it does.
  Include trigger phrases in English and Chinese where relevant. Under ~500 chars.
---

# New Skill Name

## When to use
...

## When NOT to use
...

## Process
...
```

Commit and push — `npx skills add meirongdev/matt-daily-skills` picks it up automatically on next install. No registration needed.

## How skills work end-to-end

See [`docs/skill-execution.md`](docs/skill-execution.md) for how skills are discovered, matched, and loaded at runtime — agent by agent.

## License

MIT
