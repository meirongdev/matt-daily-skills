# Multi-agent skill distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn this repo into a publishable `matt-daily-skills` package that installs canonical skills into Claude Code, GitHub Copilot, Qwen Code, and Codex targets with tests and updated contributor documentation.

**Architecture:** Keep `skills/<name>/` as the single source of truth, add a small manifest per skill, and route all installation through agent-specific renderer modules plus a shared path resolver. Standardize the package layout around `bin/`, `lib/`, `skills/`, `templates/`, and `tests/`, then migrate the existing ecommerce review skill into that structure.

**Tech Stack:** Node.js >=22, zero runtime dependencies, built-in `node:test`, CommonJS modules, Markdown skills/docs, JSON manifests.

---

## File structure map

### Files to create

- `bin/cli.js` — new real package entry point
- `lib/cli.js` — shared command parsing, scaffold, and install orchestration
- `lib/frontmatter.js` — flat frontmatter parser
- `lib/discover.js` — canonical skill discovery
- `lib/fs-utils.js` — recursive copy and safe write helpers
- `lib/manifest.js` — manifest loading and validation
- `lib/paths.js` — agent + scope target resolution
- `lib/renderers/claude.js` — direct skill export for Claude/Qwen
- `lib/renderers/copilot.js` — Copilot compatibility export
- `lib/renderers/codex.js` — Codex compatibility export
- `lib/install.js` — install orchestration
- `skills/ecommerce-entry-review/SKILL.md` — migrated canonical skill
- `skills/ecommerce-entry-review/manifest.json` — export metadata for the sample skill
- `templates/skill/SKILL.md` — scaffold template
- `templates/skill/manifest.json` — scaffold manifest template
- `tests/frontmatter.test.js`
- `tests/discover.test.js`
- `tests/package-layout.test.js`
- `tests/paths.test.js`
- `tests/renderers.test.js`
- `tests/install.test.js`
- `tests/cli-new.test.js`
- `tests/readme-smoke.test.js`

### Files to modify

- `package.json` — rename package, bin aliases, scripts, metadata
- `README.md` — architecture, install flows, extension guide, testing, release notes
- `CLAUDE.md` — update repo-specific guidance after layout normalization

### Files to remove or stop using

- `cli.js` — replaced by `bin/cli.js`
- root `SKILL.md` — moved into `templates/skill/SKILL.md`
- `mnt/user-data/outputs/my-skills/skills/ecommerce-entry-review/SKILL.md` — migrated into `skills/`

## Task 1: Standardize package layout and metadata

**Files:**
- Create: `bin/cli.js`, `lib/cli.js`, `templates/skill/SKILL.md`, `templates/skill/manifest.json`, `tests/package-layout.test.js`
- Modify: `package.json`, `README.md`, `CLAUDE.md`
- Remove/replace: `cli.js`, root `SKILL.md`

- [ ] **Step 1: Write the failing package metadata test**

Create `tests/package-layout.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const pkg = require(path.join('..', 'package.json'));

test('package metadata points to the normalized CLI layout', () => {
  assert.equal(pkg.name, 'matt-daily-skills');
  assert.equal(pkg.bin['matt-daily-skills'], './bin/cli.js');
  assert.equal(pkg.bin.skills, './bin/cli.js');
  assert.equal(pkg.scripts.test, 'node --test tests/*.test.js');
  assert.match(pkg.repository.url, /matt-daily-skills/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/package-layout.test.js`
Expected: FAIL with module-not-found for `tests/package-layout.test.js` or assertion failures against the old `package.json`.

- [ ] **Step 3: Normalize package metadata and package layout**

Update `package.json` to:

```json
{
  "name": "matt-daily-skills",
  "version": "1.1.0",
  "description": "Canonical multi-agent skill library installable via npx for Claude Code, GitHub Copilot, Qwen Code, and Codex.",
  "bin": {
    "matt-daily-skills": "./bin/cli.js",
    "skills": "./bin/cli.js"
  },
  "scripts": {
    "list": "node bin/cli.js list",
    "install-all": "node bin/cli.js install --all --agent claude --force",
    "test": "node --test tests/*.test.js"
  },
  "files": [
    "bin/",
    "lib/",
    "skills/",
    "templates/",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "skills",
    "claude-code",
    "github-copilot",
    "qwen-code",
    "codex"
  ],
  "engines": {
    "node": ">=22"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/meirongdev/matt-daily-skills.git"
  },
  "author": "Matthew"
}
```

Create `bin/cli.js` as a thin bootstrap:

```js
#!/usr/bin/env node
'use strict';

const { run } = require('../lib/cli');

run(process.argv.slice(2));
```

Create `lib/cli.js` as an initial stub:

```js
'use strict';

function run() {
  console.log('matt-daily-skills CLI is not implemented yet.');
}

module.exports = { run };
```

Move the current root `SKILL.md` content into `templates/skill/SKILL.md` and add `templates/skill/manifest.json`:

```json
{
  "version": 1,
  "agents": {
    "claude": { "enabled": true },
    "qwen": { "enabled": true },
    "copilot": { "enabled": false },
    "codex": { "enabled": false }
  }
}
```

- [ ] **Step 4: Run the layout test to verify it passes**

Run: `node --test tests/package-layout.test.js`
Expected: PASS with `ok 1 - package metadata points to the normalized CLI layout`.

- [ ] **Step 5: Commit**

Run:

```bash
git add package.json bin/cli.js templates/skill/SKILL.md templates/skill/manifest.json tests/package-layout.test.js README.md CLAUDE.md
git commit -m "chore: normalize package layout" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit created with package layout normalization only.

## Task 2: Extract frontmatter parsing and canonical skill discovery

**Files:**
- Create: `lib/frontmatter.js`, `lib/discover.js`, `tests/frontmatter.test.js`, `tests/discover.test.js`
- Modify: `skills/ecommerce-entry-review/SKILL.md`

- [ ] **Step 1: Write the failing parser and discovery tests**

Create `tests/frontmatter.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFrontmatter } = require('../lib/frontmatter');

test('parseFrontmatter reads flat keys and continuation lines', () => {
  const content = [
    '---',
    'name: demo-skill',
    'description: First line',
    '  second line',
    '---',
    '',
    '# Demo'
  ].join('\n');

  assert.deepEqual(parseFrontmatter(content), {
    name: 'demo-skill',
    description: 'First line second line'
  });
});
```

Create `tests/discover.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { discoverSkills } = require('../lib/discover');

test('discoverSkills returns canonical skill metadata from skills directory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-'));
  const skillDir = path.join(root, 'skills', 'demo-skill');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: demo-skill\ndescription: demo\n---\n');
  fs.writeFileSync(path.join(skillDir, 'manifest.json'), '{"version":1,"agents":{"claude":{"enabled":true}}}');

  const skills = discoverSkills(path.join(root, 'skills'));

  assert.equal(skills.length, 1);
  assert.equal(skills[0].name, 'demo-skill');
  assert.equal(skills[0].description, 'demo');
  assert.equal(skills[0].manifestPath.endsWith('manifest.json'), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/frontmatter.test.js tests/discover.test.js`
Expected: FAIL because `../lib/frontmatter` and `../lib/discover` do not exist yet.

- [ ] **Step 3: Implement parser and discovery modules**

Create `lib/frontmatter.js`:

```js
'use strict';

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const result = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;
  let currentValue = [];

  for (const line of lines) {
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    if (pair) {
      if (currentKey) {
        result[currentKey] = currentValue.join(' ').trim();
      }
      currentKey = pair[1];
      currentValue = [pair[2]];
      continue;
    }

    if (currentKey && line.trim()) {
      currentValue.push(line.trim());
    }
  }

  if (currentKey) {
    result[currentKey] = currentValue.join(' ').trim();
  }

  return result;
}

module.exports = { parseFrontmatter };
```

Create `lib/discover.js`:

```js
'use strict';

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./frontmatter');

function discoverSkills(skillsDir) {
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  return fs.readdirSync(skillsDir)
    .filter((name) => !name.startsWith('.'))
    .map((name) => {
      const dir = path.join(skillsDir, name);
      const skillPath = path.join(dir, 'SKILL.md');
      const manifestPath = path.join(dir, 'manifest.json');

      if (!fs.statSync(dir).isDirectory()) return null;
      if (!fs.existsSync(skillPath) || !fs.existsSync(manifestPath)) return null;

      const frontmatter = parseFrontmatter(fs.readFileSync(skillPath, 'utf8'));

      return {
        name,
        dir,
        skillPath,
        manifestPath,
        description: frontmatter.description || '(no description)'
      };
    })
    .filter(Boolean);
}

module.exports = { discoverSkills };
```

Move the ecommerce example into `skills/ecommerce-entry-review/SKILL.md` without changing its frontmatter semantics.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/frontmatter.test.js tests/discover.test.js`
Expected: PASS with two passing tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add lib/frontmatter.js lib/discover.js skills/ecommerce-entry-review/SKILL.md tests/frontmatter.test.js tests/discover.test.js
git commit -m "feat: add canonical skill discovery" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit created with parser/discovery only.

## Task 3: Add manifest validation and agent path resolution

**Files:**
- Create: `lib/manifest.js`, `lib/paths.js`, `tests/paths.test.js`
- Modify: `skills/ecommerce-entry-review/manifest.json`

- [ ] **Step 1: Write the failing manifest and path tests**

Create `tests/paths.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { loadManifest } = require('../lib/manifest');
const { resolveTargetBase } = require('../lib/paths');

test('loadManifest requires version and agent map', () => {
  const manifest = loadManifest({
    version: 1,
    agents: {
      claude: { enabled: true },
      qwen: { enabled: true },
      copilot: { enabled: true, mode: 'skill-and-prompt' },
      codex: { enabled: true, mode: 'agents-and-prompts' }
    }
  });

  assert.equal(manifest.version, 1);
  assert.equal(manifest.agents.copilot.mode, 'skill-and-prompt');
});

test('resolveTargetBase returns the expected agent directories', () => {
  const home = '/tmp/test-home';
  const cwd = '/tmp/project';

  assert.equal(resolveTargetBase({ agent: 'claude', scope: 'user', home, cwd }), path.join(home, '.claude', 'skills'));
  assert.equal(resolveTargetBase({ agent: 'qwen', scope: 'project', home, cwd }), path.join(cwd, '.qwen', 'skills'));
  assert.equal(resolveTargetBase({ agent: 'copilot', scope: 'project', home, cwd }), path.join(cwd, '.github'));
  assert.equal(resolveTargetBase({ agent: 'codex', scope: 'user', home, cwd }), path.join(home, '.codex'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/paths.test.js`
Expected: FAIL because `../lib/manifest` and `../lib/paths` do not exist yet.

- [ ] **Step 3: Implement manifest validation and path rules**

Create `lib/manifest.js`:

```js
'use strict';

const fs = require('fs');

function normalizeAgentConfig(config) {
  return {
    enabled: Boolean(config && config.enabled),
    mode: config && config.mode ? config.mode : 'direct'
  };
}

function loadManifest(input) {
  const manifest = typeof input === 'string'
    ? JSON.parse(fs.readFileSync(input, 'utf8'))
    : input;

  if (!manifest || manifest.version !== 1 || typeof manifest.agents !== 'object') {
    throw new Error('Invalid manifest: expected {"version":1,"agents":{...}}');
  }

  return {
    version: 1,
    agents: {
      claude: normalizeAgentConfig(manifest.agents.claude),
      qwen: normalizeAgentConfig(manifest.agents.qwen),
      copilot: normalizeAgentConfig(manifest.agents.copilot),
      codex: normalizeAgentConfig(manifest.agents.codex)
    }
  };
}

module.exports = { loadManifest };
```

Create `lib/paths.js`:

```js
'use strict';

const os = require('os');
const path = require('path');

function resolveTargetBase({ agent, scope, customTarget, home = os.homedir(), cwd = process.cwd() }) {
  if (customTarget) {
    return path.resolve(customTarget);
  }

  if (scope !== 'user' && scope !== 'project') {
    throw new Error(`Unsupported scope: ${scope}`);
  }

  const root = scope === 'user' ? home : cwd;

  switch (agent) {
    case 'claude':
      return path.join(root, '.claude', 'skills');
    case 'qwen':
      return path.join(root, '.qwen', 'skills');
    case 'copilot':
      return scope === 'user'
        ? path.join(root, '.copilot')
        : path.join(root, '.github');
    case 'codex':
      return path.join(root, '.codex');
    default:
      throw new Error(`Unsupported agent: ${agent}`);
  }
}

module.exports = { resolveTargetBase };
```

Create `skills/ecommerce-entry-review/manifest.json`:

```json
{
  "version": 1,
  "agents": {
    "claude": { "enabled": true },
    "qwen": { "enabled": true },
    "copilot": { "enabled": true, "mode": "skill-and-prompt" },
    "codex": { "enabled": true, "mode": "agents-and-prompts" }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/paths.test.js`
Expected: PASS with two passing tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add lib/manifest.js lib/paths.js skills/ecommerce-entry-review/manifest.json tests/paths.test.js
git commit -m "feat: add agent manifest and path rules" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit created with manifest/path resolution only.

## Task 4: Implement renderers and install orchestration

**Files:**
- Create: `lib/fs-utils.js`, `lib/renderers/claude.js`, `lib/renderers/copilot.js`, `lib/renderers/codex.js`, `lib/install.js`, `tests/renderers.test.js`, `tests/install.test.js`

- [ ] **Step 1: Write the failing renderer and install tests**

Create `tests/renderers.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderClaudeLike } = require('../lib/renderers/claude');
const { renderCopilot } = require('../lib/renderers/copilot');
const { renderCodex } = require('../lib/renderers/codex');

const skill = {
  name: 'demo-skill',
  content: '---\nname: demo-skill\ndescription: demo\n---\n\n# Demo',
  manifest: {
    version: 1,
    agents: {
      claude: { enabled: true, mode: 'direct' },
      qwen: { enabled: true, mode: 'direct' },
      copilot: { enabled: true, mode: 'skill-and-prompt' },
      codex: { enabled: true, mode: 'agents-and-prompts' }
    }
  }
};

test('renderClaudeLike preserves a canonical skill tree', () => {
  const files = renderClaudeLike({ skill });
  assert.equal(files[0].path, 'demo-skill/SKILL.md');
});

test('renderCopilot emits a skill and prompt wrapper', () => {
  const files = renderCopilot({ skill });
  assert.equal(files.some((file) => file.path === 'skills/demo-skill/SKILL.md'), true);
  assert.equal(files.some((file) => file.path === 'prompts/demo-skill.prompt.md'), true);
});

test('renderCodex emits AGENTS and prompt files', () => {
  const files = renderCodex({ skill });
  assert.equal(files.some((file) => file.path === 'AGENTS.md'), true);
  assert.equal(files.some((file) => file.path === 'prompts/demo-skill.md'), true);
});
```

Create `tests/install.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { installRenderedFiles } = require('../lib/install');

test('installRenderedFiles writes files into the target base', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'install-'));
  installRenderedFiles({
    targetBase: target,
    files: [{ path: 'demo-skill/SKILL.md', content: '# Demo\n' }],
    force: false
  });

  assert.equal(fs.existsSync(path.join(target, 'demo-skill', 'SKILL.md')), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/renderers.test.js tests/install.test.js`
Expected: FAIL because the renderer/install modules do not exist yet.

- [ ] **Step 3: Implement renderers and install writer**

Create `lib/fs-utils.js`:

```js
'use strict';

const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFileSafe(filePath, content, force) {
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`Target already exists: ${filePath}`);
  }

  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

module.exports = { ensureDir, writeFileSafe };
```

Create `lib/renderers/claude.js`:

```js
'use strict';

function renderClaudeLike({ skill }) {
  return [
    { path: `${skill.name}/SKILL.md`, content: skill.content },
    ...(skill.references || []).map((ref) => ({
      path: `${skill.name}/references/${ref.name}`,
      content: ref.content
    }))
  ];
}

module.exports = { renderClaudeLike };
```

Create `lib/renderers/copilot.js`:

```js
'use strict';

function renderCopilot({ skill }) {
  return [
    { path: `skills/${skill.name}/SKILL.md`, content: skill.content },
    {
      path: `prompts/${skill.name}.prompt.md`,
      content: `# ${skill.name}\n\nUse the skill at .github/skills/${skill.name}/SKILL.md as the canonical workflow.\n`
    }
  ];
}

module.exports = { renderCopilot };
```

Create `lib/renderers/codex.js`:

```js
'use strict';

function renderCodex({ skill }) {
  return [
    {
      path: 'AGENTS.md',
      content: `# Installed skills\n\n- ${skill.name}: use prompts/${skill.name}.md for the task entrypoint.\n`
    },
    {
      path: `prompts/${skill.name}.md`,
      content: `Use the ${skill.name} workflow.\n\n${skill.content}\n`
    }
  ];
}

module.exports = { renderCodex };
```

Create `lib/install.js`:

```js
'use strict';

const path = require('path');
const { writeFileSafe } = require('./fs-utils');

function installRenderedFiles({ targetBase, files, force }) {
  for (const file of files) {
    writeFileSafe(path.join(targetBase, file.path), file.content, force);
  }
}

module.exports = { installRenderedFiles };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/renderers.test.js tests/install.test.js`
Expected: PASS with four passing tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add lib/fs-utils.js lib/renderers/claude.js lib/renderers/copilot.js lib/renderers/codex.js lib/install.js tests/renderers.test.js tests/install.test.js
git commit -m "feat: add agent renderers and install flow" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit created with renderers and writer only.

## Task 5: Rebuild the CLI around the shared modules

**Files:**
- Modify: `lib/cli.js`, `bin/cli.js`, `tests/cli-new.test.js`

- [ ] **Step 1: Write the failing CLI tests**

Create `tests/cli-new.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scaffoldSkill } = require('../lib/cli');

test('scaffoldSkill creates a new canonical skill with manifest', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-'));
  scaffoldSkill({ root, name: 'demo-skill' });

  assert.equal(fs.existsSync(path.join(root, 'skills', 'demo-skill', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(root, 'skills', 'demo-skill', 'manifest.json')), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cli-new.test.js`
Expected: FAIL because `../lib/cli` does not exist yet.

- [ ] **Step 3: Implement shared CLI logic**

Create `lib/cli.js` with:

```js
'use strict';

const fs = require('fs');
const path = require('path');
const { discoverSkills } = require('./discover');
const { loadManifest } = require('./manifest');
const { resolveTargetBase } = require('./paths');
const { renderClaudeLike } = require('./renderers/claude');
const { renderCopilot } = require('./renderers/copilot');
const { renderCodex } = require('./renderers/codex');
const { installRenderedFiles } = require('./install');

function scaffoldSkill({ root, name }) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error('Skill name must be lowercase kebab-case');
  }

  const templateDir = path.join(root, 'templates', 'skill');
  const targetDir = path.join(root, 'skills', name);
  fs.mkdirSync(targetDir, { recursive: true });

  for (const fileName of fs.readdirSync(templateDir)) {
    const source = path.join(templateDir, fileName);
    const target = path.join(targetDir, fileName);
    const content = fs.readFileSync(source, 'utf8').replace(/\{\{skill-name\}\}/g, name);
    fs.writeFileSync(target, content, 'utf8');
  }
}

function rendererFor(agent) {
  switch (agent) {
    case 'claude':
    case 'qwen':
      return renderClaudeLike;
    case 'copilot':
      return renderCopilot;
    case 'codex':
      return renderCodex;
    default:
      throw new Error(`Unsupported agent: ${agent}`);
  }
}

function run(argv) {
  void argv;
}

module.exports = { run, scaffoldSkill, rendererFor };
```

Then flesh `run(argv)` so it:

- defaults `list` when appropriate
- accepts `install <name> --agent ...`
- supports `--all`, `--user`, `--project`, `--target`, `--force`
- discovers skills from `path.join(__dirname, '..', 'skills')`
- loads each skill manifest
- selects the renderer
- installs rendered files into the resolved target

- [ ] **Step 4: Run CLI tests to verify they pass**

Run: `node --test tests/cli-new.test.js`
Expected: PASS with one passing test.

- [ ] **Step 5: Commit**

Run:

```bash
git add bin/cli.js lib/cli.js tests/cli-new.test.js
git commit -m "feat: rebuild cli on shared modules" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit created with CLI dispatch/scaffolding only.

## Task 6: Add end-to-end tests and validate the install matrix

**Files:**
- Modify: `tests/install.test.js`, `tests/renderers.test.js`, `package.json`

- [ ] **Step 1: Write failing matrix assertions**

Extend `tests/install.test.js` with:

```js
test('install rejects overwriting existing targets without force', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'install-force-'));
  const file = path.join(target, 'demo-skill', 'SKILL.md');

  installRenderedFiles({
    targetBase: target,
    files: [{ path: 'demo-skill/SKILL.md', content: '# First\n' }],
    force: false
  });

  assert.throws(() => {
    installRenderedFiles({
      targetBase: target,
      files: [{ path: 'demo-skill/SKILL.md', content: '# Second\n' }],
      force: false
    });
  }, /Target already exists/);

  assert.equal(fs.readFileSync(file, 'utf8'), '# First\n');
});
```

- [ ] **Step 2: Run the full suite to verify it fails**

Run: `npm test`
Expected: FAIL with at least one failing overwrite-protection assertion or missing CLI install path behavior.

- [ ] **Step 3: Complete the install matrix behavior**

Make sure:

- `lib/install.js` throws on overwrite without `force`
- `lib/cli.js` rejects unsupported `{agent, scope}` combinations with explicit errors
- `lib/renderers/copilot.js` writes under `.github/...` conventions when project-scoped
- `lib/renderers/codex.js` writes `AGENTS.md` and `prompts/` files relative to the `.codex` base or project root strategy chosen in code

Use this explicit error shape in CLI code:

```js
throw new Error(`Unsupported install target for ${agent}: ${scope}`);
```

- [ ] **Step 4: Run the full suite to verify it passes**

Run: `npm test`
Expected: PASS with all tests green under `node --test`.

- [ ] **Step 5: Commit**

Run:

```bash
git add lib/cli.js lib/install.js lib/renderers/copilot.js lib/renderers/codex.js tests/install.test.js tests/renderers.test.js package.json
git commit -m "test: validate multi-agent install matrix" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit created with full install behavior validation.

## Task 7: Rewrite the README and repo guidance for the normalized architecture

**Files:**
- Modify: `README.md`, `CLAUDE.md`

- [ ] **Step 1: Write the failing docs smoke test**

Create `tests/readme-smoke.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

test('README documents architecture, extension, tests, and installation', () => {
  const readme = fs.readFileSync('README.md', 'utf8');

  assert.match(readme, /matt-daily-skills/);
  assert.match(readme, /Project architecture/i);
  assert.match(readme, /Add a new skill/i);
  assert.match(readme, /GitHub Copilot/i);
  assert.match(readme, /Qwen Code/i);
  assert.match(readme, /Codex/i);
  assert.match(readme, /npm test/);
});
```

- [ ] **Step 2: Run docs smoke test to verify it fails**

Run: `node --test tests/readme-smoke.test.js`
Expected: FAIL because the old README still uses `my-skills` and does not describe the normalized architecture.

- [ ] **Step 3: Rewrite the docs**

Update `README.md` so it includes:

```md
# matt-daily-skills

## Project architecture
- `skills/` contains canonical skills
- `lib/renderers/` adapts them to Claude, Copilot, Qwen, and Codex
- `templates/skill/` scaffolds new canonical skills
- `tests/` validates parsing, rendering, install, and docs

## Install skills
### Claude Code
`npx github:meirongdev/matt-daily-skills install ecommerce-entry-review --agent claude --user`

### GitHub Copilot
`npx github:meirongdev/matt-daily-skills install ecommerce-entry-review --agent copilot --project`

### Qwen Code
`npx github:meirongdev/matt-daily-skills install ecommerce-entry-review --agent qwen --project`

### Codex
`npx github:meirongdev/matt-daily-skills install ecommerce-entry-review --agent codex --user`

## Add a new skill
1. `npx matt-daily-skills new my-new-skill`
2. edit `skills/my-new-skill/SKILL.md`
3. edit `skills/my-new-skill/manifest.json`
4. run `npm test`
```

Update `CLAUDE.md` so it no longer describes the repo as layout-inconsistent and instead documents the normalized architecture, commands, and test entrypoint.

- [ ] **Step 4: Run docs smoke test to verify it passes**

Run: `node --test tests/readme-smoke.test.js`
Expected: PASS with one passing docs test.

- [ ] **Step 5: Commit**

Run:

```bash
git add README.md CLAUDE.md tests/readme-smoke.test.js
git commit -m "docs: describe multi-agent architecture" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit created with docs only.

## Task 8: Final verification and release-readiness pass

**Files:**
- Modify if needed: any touched files above

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS with all tests green.

- [ ] **Step 2: Run the key CLI smoke commands**

Run:

```bash
node bin/cli.js list
node bin/cli.js new sample-skill
node bin/cli.js install ecommerce-entry-review --agent claude --target ./.tmp/claude --force
node bin/cli.js install ecommerce-entry-review --agent copilot --target ./.tmp/copilot --force
node bin/cli.js install ecommerce-entry-review --agent qwen --target ./.tmp/qwen --force
node bin/cli.js install ecommerce-entry-review --agent codex --target ./.tmp/codex --force
```

Expected:

- `list` prints the migrated skills
- `new` creates `skills/sample-skill/`
- each install command writes the expected agent-specific output tree

- [ ] **Step 3: Inspect generated output trees**

Run:

```bash
find ./.tmp/claude -maxdepth 3 -type f | sort
find ./.tmp/copilot -maxdepth 4 -type f | sort
find ./.tmp/qwen -maxdepth 3 -type f | sort
find ./.tmp/codex -maxdepth 4 -type f | sort
```

Expected:

- Claude/Qwen output includes `<skill>/SKILL.md`
- Copilot output includes `skills/<skill>/SKILL.md` and prompt wrapper files
- Codex output includes `AGENTS.md` and `prompts/<skill>.md`

- [ ] **Step 4: Clean up smoke-test artifacts**

Run:

```bash
rm -rf ./.tmp/claude ./.tmp/copilot ./.tmp/qwen ./.tmp/codex ./skills/sample-skill
```

Expected: temporary verification artifacts removed.

- [ ] **Step 5: Commit**

Run:

```bash
git add .
git commit -m "chore: finalize release-ready multi-agent cli" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: final verification commit created only after tests and smoke checks pass.

## Self-review

### Spec coverage

- repo normalization and rename: Tasks 1, 7
- canonical skill + manifest model: Tasks 2, 3
- multi-agent install targets: Tasks 3, 4, 5, 6
- tests: Tasks 1, 2, 3, 4, 6, 7, 8
- docs and extension guidance: Task 7

No spec gap remains.

### Placeholder scan

- no `TBD`, `TODO`, or “implement later” markers remain
- each code-changing step includes explicit file content or command expectations
- unsupported target handling is explicit rather than implied

### Type consistency

- canonical manifest API uses `version` and `agents` consistently
- renderer function names stay consistent: `renderClaudeLike`, `renderCopilot`, `renderCodex`
- install writer entrypoint stays consistent: `installRenderedFiles`
