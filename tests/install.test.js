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
  assert.equal(fs.readFileSync(path.join(target, 'demo-skill', 'SKILL.md'), 'utf8'), '# Demo\n');
});

test('installRenderedFiles rejects overwriting existing targets without force', () => {
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

test('installRenderedFiles overwrites when force is true', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'install-overwrite-'));
  const file = path.join(target, 'demo-skill', 'SKILL.md');

  installRenderedFiles({
    targetBase: target,
    files: [{ path: 'demo-skill/SKILL.md', content: '# First\n' }],
    force: false
  });

  installRenderedFiles({
    targetBase: target,
    files: [{ path: 'demo-skill/SKILL.md', content: '# Second\n' }],
    force: true
  });

  assert.equal(fs.readFileSync(file, 'utf8'), '# Second\n');
});
