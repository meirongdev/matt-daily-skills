# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A personal library of skills. Installation is handled by [`vercel-labs/skills`](https://github.com/vercel-labs/skills) (`npx skills add meirongdev/matt-daily-skills`). The repo itself is pure content — no CLI, no renderers, no build.

## Repo layout

```
matt-daily-skills/
├── skills/
│   └── <skill>/
│       ├── SKILL.md              # Canonical instruction source — the only required file
│       └── references/           # Optional — loaded on demand via progressive disclosure
├── docs/
│   └── skill-execution.md        # How each agent discovers, matches, and loads skills
├── README.md
└── package.json                  # Metadata only — no bin, no scripts
```

## Skill authoring conventions (binding)

- **`description` is the trigger** — how the agent decides to fire the skill. Be specific; include trigger phrases (English + Chinese where relevant); ~<500 chars.
- **Keep `SKILL.md` under ~500 lines.** Long material belongs in `references/` so it stays out of the system prompt until the model actually needs it.
- **Frontmatter must be flat YAML with at least `name` and `description`.** This is what every skill consumer (Claude Code, `vercel-labs/skills`, etc.) expects.
- **Skill name must be lowercase kebab-case** (`^[a-z][a-z0-9-]*$`). Renaming breaks trigger history and `/name` muscle memory.
- **Every non-trivial skill should include a `## When NOT to use` section.** The agent consults it *after* loading the body, as an escape hatch against false-positive matches.
- **No per-skill manifest** — skills are enabled/targeted at install time via `npx skills add ... --agent <name>`, not via a manifest inside the skill.

## Scaffolding a new skill

```bash
cd skills
npx skills init <new-skill-name>
```

Then fill in the template — follow the conventions above. `vercel-labs/skills` auto-discovers anything under `skills/<name>/` with a valid `SKILL.md`.

## Testing changes locally

```bash
# Dry-run: confirm the repo's skills are discoverable
npx skills add ./ --list

# Install the current working tree to a throwaway location
npx skills add ./ -g -a claude-code -s <skill-name> -y
```

## Ecosystem notes

- `.github/copilot-instructions.md` mirrors much of this file for Copilot-style assistants. Keep them in sync.
- `.worktrees/` is gitignored (isolated agent work).
