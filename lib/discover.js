'use strict';

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./frontmatter');

function discoverSkills(skillsDir) {
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  return fs.readdirSync(skillsDir)
    .filter((name) => !name.startsWith('.'))
    .map((name) => {
      const dir = path.join(skillsDir, name);
      const skillPath = path.join(dir, 'SKILL.md');
      const manifestPath = path.join(dir, 'manifest.json');

      if (!fs.statSync(dir).isDirectory()) return null;
      if (!fs.existsSync(skillPath) || !fs.existsSync(manifestPath)) return null;

      const frontmatter = parseFrontmatter(fs.readFileSync(skillPath, 'utf8'));

      return {
        name,
        dir,
        skillPath,
        manifestPath,
        description: frontmatter.description || '(no description)'
      };
    })
    .filter(Boolean);
}

module.exports = { discoverSkills };
