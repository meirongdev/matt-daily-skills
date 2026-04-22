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

test('parseFrontmatter returns empty object when no frontmatter present', () => {
  assert.deepEqual(parseFrontmatter('# Just a heading\nno frontmatter here'), {});
});

test('parseFrontmatter handles CRLF line endings', () => {
  const content = '---\r\nname: crlf-skill\r\ndescription: hi\r\n---\r\n';
  assert.deepEqual(parseFrontmatter(content), {
    name: 'crlf-skill',
    description: 'hi'
  });
});
