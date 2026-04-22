'use strict';

function renderClaudeLike({ skill }) {
  return [
    { path: `${skill.name}/SKILL.md`, content: skill.content },
    ...(skill.references || []).map((ref) => ({
      path: `${skill.name}/references/${ref.name}`,
      content: ref.content
    }))
  ];
}

module.exports = { renderClaudeLike };
