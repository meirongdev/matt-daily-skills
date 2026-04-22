Copilot instructions — meirongdev/matt-daily-skills

Purpose
- Short, repo-specific guidance to help Copilot-style assistants (and contributors) reason about layout, CLI behavior, and SKILL.md conventions used by this repo.

Quick commands (what exists)
- Node requirement: node >= 16
- package.json scripts:
  - npm run list    → node bin/cli.js list (intended)
  - npm run install-all → node bin/cli.js install --all --force
- There are no build, test, or lint scripts in this repo. No test runner is present; there is no single-test command to run.

High-level architecture (big picture)
- Purpose: a collection of "skills" (each a directory with SKILL.md + optional references/) distributed via npx.
- Intended layout (from README):
  - bin/cli.js (CLI entry)
  - skills/<skill>/SKILL.md
  - templates/skill for scaffolds
- Actual on-disk layout in this checkout is inconsistent: cli.js currently sits at repo root and a working skill is under mnt/user-data/outputs/my-skills/skills/ecommerce-entry-review/. The CLI computes REPO_ROOT = path.resolve(__dirname, '..') and therefore assumes it lives in bin/. Consequence: running the CLI as-is from the repo root will likely report "No skills found".
- Key runtime flows (read across multiple files):
  - discoverSkills() scans SKILLS_DIR (REPO_ROOT/skills) and requires a SKILL.md per skill.
  - parseFrontmatter() is a hand-rolled regex parser (see cli.js). It only supports flat key: value lines with continuation lines, no nested maps/arrays.
  - install: copyRecursive() copies the whole skill dir to the target (default ~/.claude/skills or ./ .claude/skills for --project).
  - new: cmdNew scaffolds from templates/skill and replaces the {{skill-name}} placeholder in SKILL.md.

Key conventions (repo-specific)
- SKILL.md frontmatter
  - Must include at least name and description. parseFrontmatter expects flat key: value pairs (no YAML nesting or arrays).
  - description is the trigger: include concrete trigger phrases (English + Chinese when relevant) and keep the description concise (~<500 chars ideally).
  - Keep SKILL.md under ~500 lines; push long content into references/ for progressive disclosure.
  - Skill name must be lowercase kebab-case (^[a-z][a-z0-9-]*$); cmdNew enforces this.
- Templates
  - templates/skill/SKILL.md uses a {{skill-name}} placeholder that cmdNew replaces.
- Packaging and distribution
  - npx caching: bump package.json version when publishing material changes; npx installs by ref/version.
- parseFrontmatter limitations
  - Only key: value lines are supported plus continuation lines appended to the current key. Do NOT rely on nested YAML structures, arrays, or complex quoting.

Practical notes for Copilot sessions
- If an instruction involves running the CLI locally, first fix the layout or run with the intended layout:
  - Option A (recommend): move cli.js → bin/cli.js and ensure skills/ and templates/ exist at REPO_ROOT.
  - Option B: modify REPO_ROOT in cli.js to use __dirname instead of path.resolve(__dirname, '..'). (Be explicit when making this change.)
- To test installing a skill: ensure a skills/<name>/SKILL.md exists (not the mnt path). You can copy the mnt skill to skills/ before invoking the CLI if testing locally.
- When editing or generating SKILL.md, conform to parseFrontmatter's flat format so discoverSkills() reads fields correctly.

References (important source files)
- README.md — usage, intended layout, and npx notes.
- CLAUDE.md — repository-specific guidance, and explicit note about the layout mismatch.
- cli.js — small, zero-dependency Node CLI implementing discover/install/new. Read for parseFrontmatter, discoverSkills, and install/new logic.
- mnt/user-data/outputs/... — contains an example skill (ecommerce-entry-review) in this checkout; useful reference content but not in the expected skills/ path.

Gotchas & reminders
- No test/lint/build steps exist in this repo; do not assume test runners or linters are installed.
- parseFrontmatter is intentionally simple — keep frontmatter flat and short.
- When generating or changing many files that are distributed via npx, bump package.json version to avoid caching issues.

If you'd like, add explicit examples of: (a) a valid SKILL.md frontmatter block to generate, or (b) an automated test scaffold for SKILL.md parsing and discoverSkills().

Created from: README.md, CLAUDE.md, cli.js, SKILL.md (ecommerce-entry-review example)

--
This file was added to help Copilot-style assistants operate reliably in this repository. If any section should be expanded or a missing area (for example, guidance for adding unit tests or CI) should be included, say which part to expand.