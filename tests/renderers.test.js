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
  assert.equal(files[0].content, skill.content);
});

test('renderClaudeLike includes references when present', () => {
  const files = renderClaudeLike({
    skill: { ...skill, references: [{ name: 'notes.md', content: 'note body' }] }
  });
  assert.equal(files.length, 2);
  assert.equal(files[1].path, 'demo-skill/references/notes.md');
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
