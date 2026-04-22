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

test('discoverSkills skips directories missing SKILL.md or manifest.json', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-'));
  const partial = path.join(root, 'skills', 'partial');
  fs.mkdirSync(partial, { recursive: true });
  fs.writeFileSync(path.join(partial, 'SKILL.md'), '---\nname: partial\ndescription: x\n---\n');
  // no manifest.json

  assert.deepEqual(discoverSkills(path.join(root, 'skills')), []);
});

test('discoverSkills returns [] when skills dir does not exist', () => {
  assert.deepEqual(discoverSkills('/nonexistent/path'), []);
});
