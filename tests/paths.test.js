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

test('loadManifest throws on invalid shape', () => {
  assert.throws(() => loadManifest({}), /Invalid manifest/);
  assert.throws(() => loadManifest({ version: 2, agents: {} }), /Invalid manifest/);
  assert.throws(() => loadManifest(null), /Invalid manifest/);
});

test('resolveTargetBase returns the expected agent directories', () => {
  const home = '/tmp/test-home';
  const cwd = '/tmp/project';

  assert.equal(resolveTargetBase({ agent: 'claude', scope: 'user', home, cwd }), path.join(home, '.claude', 'skills'));
  assert.equal(resolveTargetBase({ agent: 'qwen', scope: 'project', home, cwd }), path.join(cwd, '.qwen', 'skills'));
  assert.equal(resolveTargetBase({ agent: 'copilot', scope: 'project', home, cwd }), path.join(cwd, '.github'));
  assert.equal(resolveTargetBase({ agent: 'codex', scope: 'user', home, cwd }), path.join(home, '.codex'));
});

test('resolveTargetBase honors customTarget over scope', () => {
  assert.equal(
    resolveTargetBase({ agent: 'claude', scope: 'user', customTarget: '/tmp/custom', home: '/h', cwd: '/c' }),
    path.resolve('/tmp/custom')
  );
});

test('resolveTargetBase rejects unknown agents and scopes', () => {
  assert.throws(
    () => resolveTargetBase({ agent: 'unknown', scope: 'user', home: '/h', cwd: '/c' }),
    /Unsupported agent/
  );
  assert.throws(
    () => resolveTargetBase({ agent: 'claude', scope: 'global', home: '/h', cwd: '/c' }),
    /Unsupported scope/
  );
});
