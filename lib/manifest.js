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
