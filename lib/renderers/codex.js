'use strict';

function renderCodex({ skill }) {
  return [
    {
      path: 'AGENTS.md',
      content: `# Installed skills\n\n- ${skill.name}: use prompts/${skill.name}.md for the task entrypoint.\n`
    },
    {
      path: `prompts/${skill.name}.md`,
      content: `Use the ${skill.name} workflow.\n\n${skill.content}\n`
    }
  ];
}

module.exports = { renderCodex };
