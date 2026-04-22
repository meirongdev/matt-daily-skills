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
