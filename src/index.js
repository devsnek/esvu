'use strict';

const fs = require('fs');
const path = require('path');

const engines = {};
const enginesByName = {};
fs.readdirSync(path.join(__dirname, 'engines'))
  .forEach((f) => {
    if (!f.endsWith('.js')) {
      return;
    }
    const e = require(`./engines/${f}`);
    engines[e.config.id] = e;
    enginesByName[e.config.name.toLowerCase()] = e;
  });

function getInstaller(name) {
  name = name.toLowerCase();
  if (engines[name]) {
    return engines[name];
  }
  if (enginesByName[name]) {
    return enginesByName[name];
  }
  return undefined;
}

module.exports.getInstaller = getInstaller;

module.exports.engines = engines;
