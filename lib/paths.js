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
