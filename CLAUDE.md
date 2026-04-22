# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A personal library of Claude **skills** distributed via `npx`, now being generalized to multi-agent (Claude Code, GitHub Copilot, Qwen Code, Codex). One canonical source per skill under `skills/<name>/`; the CLI renders per-agent install outputs at install time. Zero runtime dependencies (Node built-ins only), Node >=22.

## Current state: mid-migration — read this first

The package layout is normalized (`bin/`, `lib/`, `templates/`, `package.json#bin` all match), but the CLI itself and the canonical `skills/` tree are not implemented yet.

- `bin/cli.js` is a thin bootstrap that calls `lib/cli.js`.
- `lib/cli.js` is a stub: `run()` prints `"matt-daily-skills CLI is not implemented yet."` So `npm run list`, `npm run install-all`, and every `node bin/cli.js …` invocation currently no-op.
- `skills/` does not exist at the repo root. The only existing skill content lives at `mnt/user-data/outputs/my-skills/skills/ecommerce-entry-review/SKILL.md` (legacy path). Task 2 of the plan migrates it.
- `tests/` does not exist yet, even though `package.json#scripts.test` is `node --test tests/*.test.js`. Running `npm test` today errors.

The design spec is at `docs/superpowers/specs/2026-04-22-multi-agent-skill-distribution-design.md`. The task-by-task plan (with code blocks to paste) is at `docs/superpowers/plans/2026-04-22-multi-agent-skill-distribution.md` — it's the source of truth for what the CLI, renderers, manifest schema, and tests should look like. Follow it rather than improvising when implementing.

## Target architecture (per spec, not yet built)

Single canonical source → per-agent renderer:

- `skills/<name>/SKILL.md` — canonical instruction file, flat frontmatter with `name` + `description` required
- `skills/<name>/manifest.json` — required; declares which agent targets are enabled and their render `mode`
- `skills/<name>/references/` — optional progressive-disclosure material

`lib/` will hold `discover.js`, `frontmatter.js`, `manifest.js`, `paths.js`, `install.js`, `fs-utils.js`, and `renderers/{claude,copilot,codex}.js` (Qwen reuses the Claude renderer). `templates/skill/` is already the scaffold source for `new <name>` (uses `{{skill-name}}` placeholder).

## Agent target paths

| Agent | User scope | Project scope |
|---|---|---|
| Claude | `~/.claude/skills/` | `.claude/skills/` |
| Qwen | `~/.qwen/skills/` | `.qwen/skills/` |
| Copilot | `~/.copilot/` (limited) | `.github/` (primary) |
| Codex | `~/.codex/` | repo `AGENTS.md` + `prompts/` |

The CLI must **fail explicitly** on unsupported `{agent, scope}` combinations — no silent fallbacks.

## Commands (once implemented)

```
matt-daily-skills list
matt-daily-skills install <skill> --agent <claude|copilot|qwen|codex> [--user|--project|--target <dir>] [--force]
matt-daily-skills install --all --agent <agent> [flags]
matt-daily-skills new <skill>
```

`skills` is a bin alias for `matt-daily-skills`. Tests: `npm test` → `node --test tests/*.test.js`. No build, no lint.

## Skill authoring conventions (binding)

- **`description` is the trigger** — how Claude decides to fire the skill. Be specific; include trigger phrases (Chinese + English where relevant); ~<500 chars.
- **Keep `SKILL.md` under ~500 lines.** Long material belongs in `references/`.
- **Frontmatter must stay flat.** The planned `parseFrontmatter` only supports `key: value` + continuation lines — no nested maps, no arrays, no complex quoting.
- **Skill name must be lowercase kebab-case** (`^[a-z][a-z0-9-]*$`).
- **Bump `package.json#version` on material changes** — `npx` caches GitHub installs by version.
- **Every skill needs a `manifest.json`** with the shape `{ "version": 1, "agents": { claude|qwen|copilot|codex: { enabled, mode? } } }`.

## Ecosystem notes

- `.github/copilot-instructions.md` is a Copilot-oriented mirror of much of this file. If you restructure repo conventions here, update it too — it's checked in and will drift.
- `.worktrees/` is gitignored (used for isolated agent work).
- `mnt/user-data/outputs/my-skills/` is legacy from an earlier export and should disappear once Task 2 of the plan migrates the sample skill into `skills/`.
