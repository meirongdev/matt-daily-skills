# Copilot instructions — meirongdev/matt-daily-skills

## Purpose

Short, repo-specific guidance to help Copilot-style assistants reason about layout and `SKILL.md` conventions used by this repo.

## What this repo is

A pure-content skills library. Installation is handled by the third-party CLI [`vercel-labs/skills`](https://github.com/vercel-labs/skills):

```bash
npx skills add meirongdev/matt-daily-skills
```

Supports 40+ coding agents (Claude Code, Qwen Code, Codex, GitHub Copilot, Cursor, Gemini CLI, and more). There is no custom CLI, no renderers, no build.

## Repo layout

```
skills/<skill>/
  SKILL.md               # Canonical instruction source — the only required file
  references/            # Optional — progressive-disclosure material
docs/skill-execution.md  # How each agent discovers, matches, and loads skills
```

No `bin/`, `lib/`, or `tests/` — those were removed when the custom CLI was retired.

## Skill authoring conventions

- `SKILL.md` must have flat YAML frontmatter with `name` and `description` at minimum.
- `description` is the trigger — be specific, include trigger phrases (English + Chinese when relevant), keep under ~500 chars.
- Keep the body under ~500 lines; push long content into `references/` for progressive disclosure.
- Skill name must be lowercase kebab-case (`^[a-z][a-z0-9-]*$`).
- Include a `## When NOT to use` section in every non-trivial skill — the agent consults it after loading to guard against false-positive triggers.
- No per-skill manifest. Agent targeting happens at install time via `npx skills add … -a <agent>`.

## Practical workflow

- Scaffold a new skill: `cd skills && npx skills init <name>`.
- Dry-run the repo locally: `npx skills add ./ --list`.
- Install the working tree to test: `npx skills add ./ -g -a claude-code -s <name> -y`.
- When editing `SKILL.md`, keep frontmatter flat and the description trigger-friendly.

## References

- `README.md` — user-facing install guide.
- `CLAUDE.md` — repo guidance for Claude Code agents (largely the same content as this file).
- `docs/skill-execution.md` — how skills are discovered, matched, and loaded end-to-end.
- [`vercel-labs/skills`](https://github.com/vercel-labs/skills) — the installer CLI itself.
