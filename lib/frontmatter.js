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
