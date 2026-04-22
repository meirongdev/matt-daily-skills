Copilot instructions — meirongdev/matt-daily-skills

Purpose
- Short, repo-specific guidance to help Copilot-style assistants (and contributors) reason about layout, CLI behavior, and SKILL.md conventions used by this repo.

Quick commands
- Node requirement: node >= 22
- package.json scripts:
  - npm run list        → node bin/cli.js list
  - npm run install-all → node bin/cli.js install --all --agent claude --force
  - npm test            → node --test tests/*.test.js
- No build or lint scripts.

High-level architecture (big picture)
- Purpose: a collection of "skills" (each a directory with SKILL.md + manifest.json + optional references/) distributed via npx, installable into Claude Code, GitHub Copilot, Qwen Code, and Codex.
- Repo layout (normalized):
  - bin/cli.js              ← entry point, dispatches to lib/cli.js
  - lib/cli.js              ← command dispatch, arg parsing, scaffold
  - lib/discover.js         ← canonical skill discovery
  - lib/frontmatter.js      ← flat frontmatter parser
  - lib/manifest.js         ← manifest loading/validation
  - lib/paths.js            ← {agent, scope} → target path
  - lib/install.js          ← install orchestration
  - lib/fs-utils.js         ← safe write helpers
  - lib/renderers/claude.js, copilot.js, codex.js  ← per-agent renderers (Qwen reuses Claude's)
  - skills/<skill>/         ← canonical skill source
  - templates/skill/        ← scaffold source for `new` command
  - tests/                  ← node --test suite (25 tests)
- Current state: fully implemented per plan Tasks 1–6. 25 tests pass under `npm test`. Sample skill `ecommerce-entry-review` migrated under `skills/`. The legacy `mnt/` tree has been removed.
- Key runtime flows:
  - discoverSkills() scans skills/ and requires both SKILL.md and manifest.json per skill dir.
  - parseFrontmatter() is a flat parser: key: value lines plus continuation lines — no YAML nesting or arrays.
  - install: load manifest → check agent.enabled → pick renderer → resolve target path → write files (rejects overwrites without --force).
  - new: copies templates/skill/, replaces {{skill-name}} placeholder; enforces lowercase kebab-case naming.

Multi-agent install
- Every install command requires --agent <claude|copilot|qwen|codex>.
- Target paths per {agent, scope}:
  - Claude Code:      user → ~/.claude/skills/          project → .claude/skills/
  - Qwen Code:        user → ~/.qwen/skills/             project → .qwen/skills/
  - GitHub Copilot:   user → ~/.copilot/ (limited)       project → .github/skills/ (primary)
  - Codex:            user → ~/.codex/                   project → ./.codex/ (renderer emits AGENTS.md + prompts/<name>.md inside)
- Unsupported {agent, scope} combinations must fail explicitly — no silent fallbacks.

Key conventions (repo-specific)
- SKILL.md frontmatter
  - Must include at least name and description. parseFrontmatter expects flat key: value pairs (no YAML nesting or arrays).
  - description is the trigger: include concrete trigger phrases (English + Chinese when relevant) and keep it under ~500 chars.
  - Keep SKILL.md under ~500 lines; push long content into references/ for progressive disclosure.
  - Skill name must be lowercase kebab-case (^[a-z][a-z0-9-]*$); the new command enforces this.
- manifest.json (required alongside SKILL.md)
  - Shape: { "version": 1, "agents": { "claude": { "enabled": true }, ... } }
  - Copilot and Codex entries may include a "mode" field (e.g. "skill-and-prompt", "agents-and-prompts").
- Templates
  - templates/skill/SKILL.md uses {{skill-name}} placeholder; templates/skill/manifest.json is the starter manifest.
- Packaging and distribution
  - Bump package.json version on every material change; npx caches by version.

Practical notes for Copilot sessions
- To test installing a skill locally: ensure skills/<name>/SKILL.md and skills/<name>/manifest.json exist, then run node bin/cli.js install <name> --agent claude --force.
- To test with the legacy sample skill: copy mnt/user-data/outputs/my-skills/skills/ecommerce-entry-review/ to skills/ecommerce-entry-review/ before invoking the CLI.
- When editing or generating SKILL.md, conform to parseFrontmatter's flat format so discoverSkills() reads fields correctly.
- Run npm test after any change to lib/ or tests/. The suite uses built-in node:test and assert — no additional packages.

References (important source files)
- README.md — user-facing install guide, CLI reference, agent path table.
- CLAUDE.md — repository-specific guidance for Claude Code agents.
- docs/skill-execution.md — how skills are distributed and executed end-to-end.
- docs/superpowers/specs/2026-04-22-multi-agent-skill-distribution-design.md — full design rationale.
- docs/superpowers/plans/2026-04-22-multi-agent-skill-distribution.md — task-by-task implementation plan.
- mnt/user-data/outputs/... — legacy sample skill (ecommerce-entry-review); useful reference, not in the expected skills/ path.

Gotchas & reminders
- parseFrontmatter is intentionally simple — keep frontmatter flat and short.
- The --agent flag is required for all install commands; the CLI must reject calls that omit it.
- When generating or changing files distributed via npx, bump package.json version to avoid caching issues.

--
This file was added to help Copilot-style assistants operate reliably in this repository. If any section should be expanded, say which part to expand.
