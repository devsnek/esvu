'use strict';

const fs = require('fs');
const path = require('path');

const engines = {};
fs.readdirSync(path.join(__dirname, 'engines'))
  .forEach((f) => {
    if (!f.endsWith('.js')) {
      return;
    }
    const e = require(`./engines/${f}`);
    engines[e.config.id] = e;
  });

module.exports.engines = engines;
