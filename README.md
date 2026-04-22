# matt-daily-skills

Canonical multi-agent skill library installable via `npx`.

## Quick start

```bash
# See what's available
npx github:meirongdev/matt-daily-skills list

# Install one skill to ~/.claude/skills/
npx github:meirongdev/matt-daily-skills install ecommerce-entry-review

# Install into current project (./.claude/skills/)
npx github:meirongdev/matt-daily-skills install ecommerce-entry-review --project

# Install everything (e.g. on a new machine)
npx github:meirongdev/matt-daily-skills install --all

# Overwrite existing
npx github:meirongdev/matt-daily-skills install ecommerce-entry-review --force
```

> **npx caching**: npx caches GitHub installs by ref. If a fresh install doesn't pick up recent changes, bump `version` in `package.json`.

## Repo structure

```
mat
t-daily-skills/
├── package.json                     # npm metadata; `bin` → bin/cli.js
├── bin/
│   └── cli.js                       # Entry point
├── lib/
│   └── cli.js                       # CLI implementation stub
├── templates/
│   └── skill/                       # Used by `new` command
│       ├── SKILL.md
│       └── manifest.json
└── README.md
```

## Skills in this repo

Run `npx github:meirongdev/matt-daily-skills list` for the live list.

## Adding a new skill

Two ways:

### The fast way: scaffold from template

```bash
# Clone locally first (scaffolding needs a writable repo)
git clone https://github.com/meirongdev/matt-daily-skills.git
cd matt-daily-skills

# Create a new skill from template
node bin/cli.js new my-new-skill

# Edit skills/my-new-skill/SKILL.md — especially the description (that's the trigger)
# Add any reference files under skills/my-new-skill/references/

# Test locally
node bin/cli.js install my-new-skill --force

# Commit and push
git add . && git commit -m "Add my-new-skill" && git push
```

### The manual way

Just drop a folder into `skills/<your-skill-name>/` with a valid `SKILL.md`. The CLI auto-discovers it — no registration needed.

**What makes a valid `SKILL.md`?**

```markdown
---
name: your-skill-name
description: Single-paragraph description. This is how Claude decides to trigger the skill, so be specific. Include trigger phrases (ideally in both languages). Under ~500 chars.
---

# Your Skill Name

## Process
### Step 1: ...
### Step 2: ...

## Output format
(What Claude should produce)
```

Frontmatter must have at least `name` and `description`.

## CLI reference

```
npx github:meirongdev/matt-daily-skills [command]

Commands:
  list                          List all skills in this repo
  install <n>                   Install a skill
  install --all                 Install every skill
  new <n>                       Scaffold a new skill from template

Install flags:
  -u, --user                    Install to ~/.claude/skills/ (default)
  -p, --project                 Install to ./.claude/skills/
  -t, --target <dir>            Install to a custom directory
  -f, --force                   Overwrite existing skill
```

## Using with different agents

| Agent | Target path |
|---|---|
| **Claude Code** (user-level) | `~/.claude/skills/` — the default |
| **Claude Code** (project) | `.claude/skills/` in project root — use `--project` |
| **Other agents** | Use `--target <path>` for a custom install location |

## Maintenance tips

- **Bump the `version` in `package.json`** when you ship a material change. npx caches per version, so bumping ensures fresh installs.
- **Keep each SKILL.md under ~500 lines.** Longer content goes in `references/` and is loaded only when needed.
- **When editing a description**, remember it's the trigger. Make it specific so the skill actually fires when it should.

## License

MIT
