'use strict';

function renderCopilot({ skill }) {
  const files = [
    { path: `skills/${skill.name}/SKILL.md`, content: skill.content },
    {
      path: `prompts/${skill.name}.prompt.md`,
      content: `# ${skill.name}\n\nUse the skill at .github/skills/${skill.name}/SKILL.md as the canonical workflow.\n`
    }
  ];

  for (const ref of skill.references || []) {
    files.push({
      path: `skills/${skill.name}/references/${ref.name}`,
      content: ref.content
    });
  }

  return files;
}

module.exports = { renderCopilot };
