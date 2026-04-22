# matt-daily-skills

Canonical multi-agent skill library for Claude Code, GitHub Copilot, Qwen Code, and Codex — installable via `npx`, zero runtime dependencies.

## Requirements

Node >=22.

## Installation

No global install required — run directly via `npx`:

```bash
npx github:meirongdev/matt-daily-skills <command>
```

Or install once globally:

```bash
npm install -g github:meirongdev/matt-daily-skills
matt-daily-skills list
```

> **npx caching:** npx caches GitHub installs by ref. If a fresh install doesn't pick up recent changes, add `--yes` to bypass the cache, or bump `version` in `package.json` before pushing.

## Quick start

```bash
# See what's available
npx github:meirongdev/matt-daily-skills list

# Install one skill for Claude Code (user-level → ~/.claude/skills/)
npx github:meirongdev/matt-daily-skills install ecommerce-entry-review --agent claude

# Install into the current project (./.claude/skills/)
npx github:meirongdev/matt-daily-skills install ecommerce-entry-review --agent claude --project

# Install all skills for Copilot (project-level → .github/skills/)
npx github:meirongdev/matt-daily-skills install --all --agent copilot --project

# Overwrite an existing install
npx github:meirongdev/matt-daily-skills install ecommerce-entry-review --agent claude --force
```

## Skills in this repo

Run `npx github:meirongdev/matt-daily-skills list` for the live list.

## CLI reference

```
npx github:meirongdev/matt-daily-skills [command]

Commands:
  list                          List all skills in this repo
  install <skill>               Install a skill
  install --all                 Install every skill
  new <skill>                   Scaffold a new skill from template

Required for install:
  -a, --agent <agent>           Target agent: claude | copilot | qwen | codex

Scope (install, optional):
  -u, --user                    User-level install (default)
  -p, --project                 Project-level install
  -t, --target <dir>            Custom install directory

Other:
  -f, --force                   Overwrite existing skill
```

## Agent install paths

| Agent | User scope | Project scope |
|---|---|---|
| **Claude Code** | `~/.claude/skills/` | `.claude/skills/` |
| **Qwen Code** | `~/.qwen/skills/` | `.qwen/skills/` |
| **GitHub Copilot** | limited (`~/.copilot/`) | `.github/skills/` (primary) |
| **Codex** | `~/.codex/` | `.codex/` |

Each target is the install *base*; the per-agent renderer writes files beneath it (e.g. Codex writes `AGENTS.md` and `prompts/<skill>.md` inside the base; Copilot writes `skills/<skill>/` and `prompts/<skill>.prompt.md`). Unsupported `{agent, scope}` combinations fail explicitly — the CLI never silently falls back.

> **Note on Codex project scope:** the current path resolver puts everything under `<cwd>/.codex/`. If you want `AGENTS.md` at the repo root (the real-world Codex convention), change `lib/paths.js` and `lib/renderers/codex.js` together — the design leaves this adjustable.

## Repo structure

```
matt-daily-skills/
├── bin/
│   └── cli.js                       # Entry point — dispatches to lib/cli.js
├── lib/
│   ├── cli.js                       # Command parsing and orchestration
│   ├── discover.js                  # Canonical skill discovery
│   ├── frontmatter.js               # Flat frontmatter parser
│   ├── manifest.js                  # Manifest loading and validation
│   ├── paths.js                     # {agent, scope} → target path resolver
│   ├── install.js                   # Install orchestration
│   └── renderers/
│       ├── claude.js                # Claude/Qwen direct install
│       ├── copilot.js               # Copilot compatibility export
│       └── codex.js                 # Codex compatibility export
├── skills/
│   └── <skill>/
│       ├── SKILL.md                 # Canonical instruction source
│       ├── manifest.json            # Enabled agents and render mode
│       └── references/              # Optional long-form supporting material
├── templates/
│   └── skill/                       # Source for `new` command scaffolding
│       ├── SKILL.md
│       └── manifest.json
├── tests/                           # node --test suite
├── README.md
└── package.json
```

## Adding a new skill

### Scaffold from template

```bash
git clone https://github.com/meirongdev/matt-daily-skills.git
cd matt-daily-skills

node bin/cli.js new my-new-skill

# Edit the generated files:
#   skills/my-new-skill/SKILL.md       ← description is the trigger
#   skills/my-new-skill/manifest.json  ← enable/disable per agent

# Test locally
node bin/cli.js install my-new-skill --agent claude --force

git add . && git commit -m "Add my-new-skill" && git push
```

### Manual drop-in

Create `skills/<your-skill-name>/` with the two required files. The CLI auto-discovers it — no registration needed.

**`SKILL.md`** (frontmatter must be flat — no YAML nesting or arrays):

```markdown
---
name: your-skill-name
description: One paragraph describing when this skill should trigger and what it does.
  Include trigger phrases in English and Chinese where relevant. Under ~500 chars.
---

# Your Skill Name

## When to use
- ...

## When NOT to use
- Not for: ...

## Process
### Step 1: ...
### Step 2: ...

## Output format
(What the model should produce)
```

**`manifest.json`:**

```json
{
  "version": 1,
  "agents": {
    "claude":  { "enabled": true },
    "qwen":    { "enabled": true },
    "copilot": { "enabled": true, "mode": "skill-and-prompt" },
    "codex":   { "enabled": true, "mode": "agents-and-prompts" }
  }
}
```

## Running tests

```bash
npm test
# → node --test tests/*.test.js
```

## Maintenance tips

- **Bump `version` in `package.json`** on every material change — npx caches by version.
- **Keep `SKILL.md` under ~500 lines.** Longer content goes in `references/` and is loaded only when needed.
- **`description` is the trigger.** Make it specific so the skill fires when it should and stays quiet when it shouldn't.
- **Skill name must be lowercase kebab-case** (`^[a-z][a-z0-9-]*$`). Renaming breaks implicit trigger history and `/name` muscle memory.
- **Frontmatter must stay flat** — the parser handles `key: value` plus continuation lines only; no YAML nesting, arrays, or complex quoting.

## Architecture notes

How skills go from `SKILL.md` to execution inside an agent: [`docs/skill-execution.md`](docs/skill-execution.md)

Design rationale and full target architecture: [`docs/superpowers/specs/2026-04-22-multi-agent-skill-distribution-design.md`](docs/superpowers/specs/2026-04-22-multi-agent-skill-distribution-design.md)

## License

MIT
