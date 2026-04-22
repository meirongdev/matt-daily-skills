'use strict';

const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFileSafe(filePath, content, force) {
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`Target already exists: ${filePath}`);
  }

  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

module.exports = { ensureDir, writeFileSafe };
