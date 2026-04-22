'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scaffoldSkill, parseArgs, rendererFor } = require('../lib/cli');

test('scaffoldSkill creates a new canonical skill with manifest', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-'));
  scaffoldSkill({ root, name: 'demo-skill' });

  assert.equal(fs.existsSync(path.join(root, 'skills', 'demo-skill', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(root, 'skills', 'demo-skill', 'manifest.json')), true);
});

test('scaffoldSkill substitutes {{skill-name}} in SKILL.md', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-'));
  scaffoldSkill({ root, name: 'my-skill' });

  const content = fs.readFileSync(path.join(root, 'skills', 'my-skill', 'SKILL.md'), 'utf8');
  assert.equal(content.includes('{{skill-name}}'), false);
  assert.equal(content.includes('my-skill'), true);
});

test('scaffoldSkill rejects names that are not lowercase kebab-case', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-'));
  assert.throws(() => scaffoldSkill({ root, name: 'Not-Valid' }), /kebab-case/);
  assert.throws(() => scaffoldSkill({ root, name: '1-leading-digit' }), /kebab-case/);
});

test('parseArgs recognises agent, scope, target, and force flags', () => {
  const args = parseArgs(['ecommerce-entry-review', '--agent', 'claude', '--project', '--force']);
  assert.equal(args.positional[0], 'ecommerce-entry-review');
  assert.equal(args.agent, 'claude');
  assert.equal(args.scope, 'project');
  assert.equal(args.force, true);
});

test('parseArgs accepts --all without positional skill', () => {
  const args = parseArgs(['--all', '--agent', 'copilot', '--target', '/tmp/out']);
  assert.equal(args.all, true);
  assert.equal(args.agent, 'copilot');
  assert.equal(args.target, '/tmp/out');
});

test('rendererFor maps agents to renderers and rejects unknown', () => {
  assert.equal(typeof rendererFor('claude'), 'function');
  assert.equal(rendererFor('claude'), rendererFor('qwen'));
  assert.throws(() => rendererFor('unknown'), /Unsupported agent/);
});
