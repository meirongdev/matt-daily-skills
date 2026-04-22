# How skills work: authoring, distribution, execution

This doc explains how a skill goes from a file in this repo to something a coding agent actually uses at runtime. It's meant for contributors to this repo and for anyone new to the agent-skill ecosystem.

## Two layers, keep them separate

Two distinct systems are involved. Mixing them up is the most common source of confusion.

1. **Distribution layer** — what this repo does. Takes a canonical `SKILL.md` and writes it to the path the target agent expects.
2. **Execution layer** — what the agent does after the file is on disk. Discovery, triggering, loading, following instructions.

The two layers share no runtime code. Once files land on disk, the distribution side is done. Everything after that is the agent's job, and the behavior is defined by the agent vendor — not by this repo.

## Layer 1: Distribution (this repo)

Input:

- `skills/<name>/SKILL.md` — canonical instruction source
- `skills/<name>/manifest.json` — enabled agents + per-agent render mode
- Optional `references/`, `scripts/` — supporting material

Pipeline (per install):

```
discover → validate → pick renderer → resolve target path → write files
```

Target path per `{agent, scope}`:

| Agent | User scope | Project scope |
|---|---|---|
| Claude Code | `~/.claude/skills/` | `<repo>/.claude/skills/` |
| Qwen Code | `~/.qwen/skills/` | `<repo>/.qwen/skills/` |
| GitHub Copilot | limited (`~/.copilot/`) | `<repo>/.github/` (primary) |
| Codex | `~/.codex/` (AGENTS.md + prompts/ inside) | `<repo>/.codex/` (same layout) — diverges from real Codex convention; see "Known follow-ups" |

Unsupported `{agent, scope}` combinations fail explicitly — the CLI never silently falls back.

Implementation status is tracked in `docs/superpowers/plans/2026-04-22-multi-agent-skill-distribution.md`. See the "Current status" section at the end.

## Layer 2: Execution (each agent)

Using Claude Code as the concrete example; other agents follow the same shape with different paths and wrappers.

### 1. Discovery

At startup, the agent scans its configured skill directories and reads each `SKILL.md`'s frontmatter. Skills missing `name` or `description` are skipped.

### 2. Registration

Only `name` + `description` get injected into the system prompt. The `SKILL.md` body is not loaded at this stage. This is intentional: it keeps the system prompt small, and it's the first half of what the ecosystem calls **progressive disclosure**.

You can verify this by inspecting an active Claude Code session's available-skills list — each entry is one line of description, with no body content.

### 3. Matching

When the user sends a message, the model decides whether any registered skill applies. Two paths:

- **Implicit** — the message's intent matches a `description` semantically.
- **Explicit** — the user types `/<skill-name>`, or invokes it by name.

This is why `description` is the single most important field in a skill: it is the trigger condition, written in natural language. A good description produces clean auto-triggers. A vague or over-broad one produces either silent misses or false positives.

A `## When NOT to use` section in the body does not affect Step 3 matching (matching happens before the body is visible). It does help in Step 5: once the body is loaded, the model uses the reverse triggers as an early escape hatch if it realizes the match was wrong.

### 4. Loading

When the model decides to use a skill, it calls a built-in `Skill` tool with the skill's `name`. The agent reads the full `SKILL.md` body and injects it as high-priority context. This is the moment the skill actually enters the conversation.

### 5. Progressive loading (optional)

If the loaded body references files under `references/` or scripts under `scripts/`, the model loads them on demand using ordinary `Read` or `Bash` tools — not automatically. This is the second half of progressive disclosure: long material stays out of the prompt until the model decides it is needed.

### 6. Following

From here, the model just follows the instructions. A skill is, in the end, a prompt injected at a controlled time. There is no separate "skill runtime" — the same model loop that drives normal conversation also executes the skill body.

## Agent-by-agent differences

Same shape, different plumbing.

| Agent | Discovery paths | Matching | Progressive loading |
|---|---|---|---|
| Claude Code | `~/.claude/skills/`, `.claude/skills/` | `Skill` tool, implicit or `/name` | Yes — `references/` and `scripts/` loaded on demand |
| Qwen Code | `~/.qwen/skills/`, `.qwen/skills/` | Similar to Claude Code | Yes |
| GitHub Copilot | `.github/skills/`, `~/.copilot/skills/` (Agent Skills); `.github/prompts/*.prompt.md` (prompt files) | Agent Skills: auto-match on description. Prompt files: `/<name>` only | Agent Skills: yes. Prompt files: no — one-shot full-content entry |
| Codex | `.agents/skills/`, `$HOME/.agents/skills/` (skills); `AGENTS.md` (always-on) | Skills: auto-match by description. `AGENTS.md`: always loaded | Yes for skills. `AGENTS.md` sits in context continuously |

Two details worth remembering:

- Copilot's `.prompt.md` files live on a different axis from Agent Skills. They are manual, one-shot, full-content entrypoints. Both coexist with no conflict.
- Codex's `AGENTS.md` is not a skill — it is always-on instructions. `.agents/skills/` is the skill mechanism.

## A concrete trigger example

A worked example from a real session in this repo.

- User asked: "review this article, plain tone, don't overstate."
- The available-skills list included `caveman-review`, whose description mentions "review this PR / code review / review the diff" and notes it auto-triggers on PR reviews.
- The description is written for **code reviews**. The user's task was about **a prose article**. The match was close but not strong enough — the model skipped the skill and handled the review inline.

If the description had been broader ("review anything"), the skill would have falsely triggered. The cost would be a wasted skill load plus possible format mismatch (a code-review template applied to prose).

This is exactly what the template's default `## When NOT to use` section is meant to prevent: it gives the model an explicit list of reverse triggers to consult once the body is loaded.

## Authoring implications

A few things follow directly from how execution works:

- `description` should name the **task type**, **trigger phrases**, and **target context**. Vague summaries produce weak matching.
- `SKILL.md` bodies should be short. Long content belongs under `references/` so it is loaded only when needed.
- Scripts should exist only when the steps really need automation. Every script is one more maintenance surface and another opportunity for version drift between agents.
- `## When NOT to use` belongs in every non-trivial skill. It costs one small section and actively reduces false positives.
- Skill names must be lowercase kebab-case and stable — renaming breaks implicit trigger history and any explicit `/name` muscle memory.

## Current status of this repo

Implemented:

- Full distribution pipeline: `list`, `install`, `new`; flat frontmatter parser; canonical skill discovery; manifest validation; per-agent path resolver; renderers for Claude/Qwen/Copilot/Codex; install writer with overwrite protection.
- Sample skill `ecommerce-entry-review` migrated under `skills/`.
- 25 tests under `tests/` covering parsing, discovery, path resolution, renderer output shapes, install behaviour (including overwrite protection), and CLI scaffolding.
- Zero runtime dependencies; Node >=22.

Known follow-ups:

- Codex project-scope output currently lands under `<cwd>/.codex/AGENTS.md` because `resolveTargetBase` returns `<root>/.codex` for both scopes. Real-world Codex convention puts `AGENTS.md` at the repo root and skills under `.agents/skills/`. Adjust `lib/paths.js` and `lib/renderers/codex.js` together if you want to match that.
- Copilot and Codex renderers do not yet export `references/` content — Claude/Qwen do.

The execution layer is always handled by the target agent and is never implemented inside this repo.

## Related docs

- `docs/superpowers/specs/2026-04-22-multi-agent-skill-distribution-design.md` — design this repo targets
- `docs/superpowers/plans/2026-04-22-multi-agent-skill-distribution.md` — task-by-task plan
- `CLAUDE.md` — short repo guidance for agents
- `README.md` — user-facing install and usage guide
- `templates/skill/SKILL.md` — default scaffold with `When to use` and `When NOT to use` sections
