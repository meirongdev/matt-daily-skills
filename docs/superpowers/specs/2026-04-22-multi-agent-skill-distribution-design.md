# Multi-agent skill distribution design

## Problem statement

The current repository is a partially wired prototype for distributing Claude-style skills via `npx`, but it is not in a publishable shape:

- the on-disk layout does not match `package.json` or the documented structure
- the CLI entry path is broken for `npx`
- the package and docs still use the old `my-skills` name
- installation behavior is Claude-only, while the target scope now includes Claude Code, GitHub Copilot, Qwen Code, and Codex
- there is no test coverage for discovery, install, or scaffolding flows

The goal is to turn the project into a stable `npx`-installable package named `matt-daily-skills` that keeps one canonical source format for skills while exporting working installs for multiple coding agents using current 2026 best practices.

## Goals

1. Standardize the repository into a publishable package layout.
2. Rename the package, docs, and CLI surface from `my-skills` to `matt-daily-skills`.
3. Keep a single canonical skill source under `skills/<name>/`.
4. Support agent-specific install targets for Claude Code, GitHub Copilot, Qwen Code, and Codex.
5. Support both user-level and project-level installs where the target agent supports them.
6. Add a lightweight test suite using built-in Node tooling.
7. Update documentation so the architecture, extension points, and installation flows are explicit.

## Non-goals

1. Maintaining separate source directories for each agent.
2. Pretending all agents natively consume `SKILL.md` in the same way.
3. Adding third-party runtime or test dependencies.
4. Building a registry, remote index, or package publishing workflow in this iteration.

## Recommended approach

Use a **single canonical skill source + agent-specific compatibility renderers** model.

Each skill remains authored once in `skills/<name>/`, with `SKILL.md` as the canonical instruction source and a small `manifest.json` describing which agent targets are supported and how the skill should be projected into each target format.

The CLI is responsible for:

1. discovering canonical skills
2. resolving the requested agent and install scope
3. rendering an agent-compatible install output
4. copying the rendered result into the requested target directory

This avoids content drift while keeping the target-agent compatibility logic isolated from the skill authoring experience.

## Alternatives considered

### 1. Separate directory tree per agent

Maintain `agents/claude`, `agents/copilot`, `agents/qwen`, and `agents/codex` source trees independently.

**Rejected because:** it creates long-term content drift and multiplies maintenance effort for every skill update.

### 2. Generic `--target` only

Expose only a raw installer and rely on documentation for each agent path.

**Rejected because:** it produces poor UX and does not meet the requirement for agent-specific installation support.

## Repository architecture

The repository should converge on the following layout:

```text
matt-daily-skills/
├── bin/
│   └── cli.js
├── lib/
│   ├── discover.js
│   ├── install.js
│   ├── manifest.js
│   ├── paths.js
│   └── renderers/
│       ├── claude.js
│       ├── copilot.js
│       └── codex.js
├── skills/
│   └── <skill>/
│       ├── SKILL.md
│       ├── manifest.json
│       └── references/
├── templates/
│   └── skill/
├── tests/
├── README.md
└── package.json
```

### Component responsibilities

- `bin/cli.js`: argument parsing, help text, command dispatch
- `lib/discover.js`: scan canonical skills and parse frontmatter
- `lib/manifest.js`: validate and normalize per-skill manifest data
- `lib/paths.js`: map `{agent, scope}` to user/project/custom target paths
- `lib/install.js`: orchestrate rendering and file writes
- `lib/renderers/*.js`: convert canonical skills into installable output for each target agent
- `templates/skill/`: scaffolding template for new skills
- `tests/`: behavior-level tests using the built-in Node test runner

## Canonical skill model

Canonical skills are authored once under `skills/<name>/`.

Required files:

- `SKILL.md`: primary instruction source
- `manifest.json`: compatibility and export metadata

Optional files:

- `references/*`: large supporting material for progressive disclosure

### `SKILL.md` rules

- must contain flat frontmatter with at least `name` and `description`
- must remain compatible with the repo's simple parser
- should stay concise, with long detail moved to `references/`

### `manifest.json` purpose

Each skill declares how it can be exported. Example shape:

```json
{
  "version": 1,
  "agents": {
    "claude": { "enabled": true },
    "qwen": { "enabled": true },
    "copilot": {
      "enabled": true,
      "mode": "skill-and-prompt"
    },
    "codex": {
      "enabled": true,
      "mode": "agents-and-prompts"
    }
  }
}
```

The exact schema can stay minimal in the first implementation, but it must be explicit enough for the CLI to reject unsupported exports instead of guessing.

## CLI design

### Command surface

```bash
matt-daily-skills list
matt-daily-skills install <skill> --agent <claude|copilot|qwen|codex> [--user|--project|--target <dir>] [--force]
matt-daily-skills install --all --agent <claude|copilot|qwen|codex> [--user|--project|--target <dir>] [--force]
matt-daily-skills new <skill>
```

Compatibility alias:

```bash
skills ...
```

### Naming

- package name: `matt-daily-skills`
- primary bin name: `matt-daily-skills`
- compatibility bin alias: `skills`

## Agent mapping

### Claude Code

- user-level: `~/.claude/skills/`
- project-level: `<repo>/.claude/skills/`
- install strategy: direct skill directory install

### Qwen Code

- user-level: `~/.qwen/skills/`
- project-level: `<repo>/.qwen/skills/`
- install strategy: direct skill directory install

### GitHub Copilot

Project-level is the primary target:

- `.github/skills/<skill>/SKILL.md`
- optional generated compatibility files under `.github/prompts/` and `.github/agents/` when the manifest requires them

User-level support may target personal Copilot directories where supported, but unsupported scope/feature combinations must fail explicitly with a message instead of silently pretending success.

Install strategy:

- preserve the canonical skill as much as possible
- generate compatible prompt/agent wrappers only when needed
- clearly report which files were generated

### Codex

- user-level guidance target: `~/.codex/AGENTS.md` and `~/.codex/prompts/`
- project-level guidance target: repository `AGENTS.md` and related project-local compatible outputs

Install strategy:

- render canonical skill content into Codex-compatible AGENTS/prompts outputs
- explicitly reject scope combinations that Codex does not support cleanly

## Data flow

Install flow:

1. parse CLI args
2. discover canonical skills
3. validate requested skill(s)
4. resolve target path from agent + scope + custom target
5. load and validate `manifest.json`
6. select renderer for the agent
7. generate installable output
8. write files unless blocked by existing content and no `--force`
9. print a concise install summary showing the rendered target files

Scaffold flow:

1. validate kebab-case name
2. copy `templates/skill/`
3. replace placeholder tokens
4. create a starter `manifest.json`
5. print next steps for local validation

## Error handling

The CLI must fail explicitly for:

- missing or malformed `SKILL.md`
- invalid or missing `manifest.json`
- unsupported `agent` value
- unsupported `{agent, scope}` combinations
- missing template directories
- existing install targets without `--force`

The CLI must not use silent fallbacks. If the user asks for a target that cannot be exported faithfully, the command should stop with a concrete explanation.

## Testing strategy

Use the built-in Node test runner (`node --test`) and `assert`.

Minimum coverage:

1. frontmatter parsing and discovery
2. path resolution for all supported agents and scopes
3. manifest validation
4. renderer output shape for Claude/Qwen/Copilot/Codex
5. install behavior with overwrite and non-overwrite cases
6. scaffold generation for `new`

Tests should use temporary directories so the suite does not touch the real home directory or live dotfiles.

## Documentation strategy

The README should become the main operator and contributor guide. It should include:

1. what the project is
2. repository architecture
3. canonical skill format
4. installation examples for each supported agent
5. how to scaffold and extend a new skill
6. how to add support for a new agent renderer
7. how to run tests
8. release/versioning guidance for `npx` caching

## Migration notes

The current repo contains an inconsistent layout (`cli.js` at root, template file at root, example skill under `mnt/...`). The implementation should normalize this to the standard package structure and move or recreate assets into their expected locations.

The repository should also replace the old package identity (`my-skills`) throughout package metadata, docs, examples, and scaffolding.

## Success criteria

The work is complete when:

1. `npx` metadata points to a real CLI entry
2. the repo contains a real `skills/` tree and a real `templates/skill/` tree
3. the package name and docs consistently use `matt-daily-skills`
4. install commands support agent-aware targets
5. unsupported targets fail explicitly
6. local tests cover discovery, rendering, install, and scaffold behavior
7. the README explains architecture, extension, and installation clearly
