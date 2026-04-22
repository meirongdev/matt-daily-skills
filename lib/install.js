'use strict';

const path = require('path');
const { writeFileSafe } = require('./fs-utils');

function installRenderedFiles({ targetBase, files, force }) {
  for (const file of files) {
    writeFileSafe(path.join(targetBase, file.path), file.content, force);
  }
}

module.exports = { installRenderedFiles };
