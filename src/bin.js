#!/usr/bin/env node

'use strict';

/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const yargs = require('yargs');
const { engines } = require('.');
const { ESVU_PATH, rmdir } = require('./common');
const Logger = require('./logger');
const packageJson = require('../package.json');

const { argv } = yargs
  .command('install <engine>', 'Install <engine>')
  .command('uninstall <engine>', 'Uninstall <engine>')
  .option('engines');

process.stdout.write(`esvu v${packageJson.version}\n`);

const STATUS_PATH = path.join(ESVU_PATH, 'status.json');

let status;
async function loadStatus(promptOnEmpty) {
  try {
    const source = await fs.promises.readFile(STATUS_PATH, 'utf8');
    status = JSON.parse(source);
  } catch {
    let selectedEngines = [];
    if (argv.engines) {
      if (argv.engines === 'all') {
        selectedEngines = Object.keys(engines)
          .filter((e) => engines[e].isSupported());
      } else {
        selectedEngines = argv.engines.split(',');
      }
    } else if (promptOnEmpty) {
      ({ selectedEngines } = await inquirer.prompt({
        name: 'selectedEngines',
        type: 'checkbox',
        message: 'Which engines would you like to install?',
        choices: Object.keys(engines).map((e) => ({
          name: engines[e].config.name,
          value: e,
          checked: engines[e].isSupported(),
        })),
      }));
    }
    status = {
      engines: selectedEngines,
      installed: {},
    };
  }

  if (!status.installed) {
    status.installed = {};
  }

  const onExit = () => {
    fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));
    process.exit();
  };
  process
    .on('exit', onExit)
    .on('SIGINT', onExit);
}

async function installEngine(engine) {
  const Installer = engines[engine];

  if (!status.installed[engine]) {
    status.installed[engine] = {
      version: undefined,
      binEntries: undefined,
    };
  }

  const logger = new Logger(Installer.config.name);
  logger.info('Checking version...');

  const version = await Installer.resolveVersion('latest');
  if (status.installed[engine].version === version) {
    logger.succeed(`Version ${version} installed`);
    return;
  }

  try {
    const binEntries = await Installer.install(version, logger);
    status.installed[engine].version = version;
    status.installed[engine].binEntries = binEntries;
    logger.succeed(`Version ${version} installed with bin entries: ${binEntries.join(', ')}`);
  } catch (e) {
    logger.fatal(e);
    process.exitCode = 1;
  }
}

(async function main() {
  if (argv._[0] === 'install') {
    if (!engines[argv.engine]) {
      process.stderr.write('Engine not recognized\n');
      process.exit(1);
    }
    await loadStatus(false);
    if (!status.engines.includes(argv.engine)) {
      status.engines.push(argv.engine);
    }
    await installEngine(argv.engine);
    return;
  }

  if (argv._[0] === 'uninstall') {
    await loadStatus(false);
    if (!status.installed[argv.engine]) {
      process.stderr.write('Engine not recognized\n');
      process.exit(1);
    }
    await Promise.all([
      status.installed[argv.engine].binEntries.map((b) =>
        fs.promises.unlink(path.join(ESVU_PATH, 'bin', b))),
      rmdir(path.join(ESVU_PATH, 'engines', argv.engine)),
    ]);
    delete status.installed[argv.engine];
    const set = new Set(status.engines);
    set.delete(argv.engine);
    status.engines = [...set];
    process.stdout.write(`Removed ${argv.engine}`);
    return;
  }

  await loadStatus(true);

  if (!status.engines || status.engines.length === 0) {
    process.stderr.write('No engines are configured to be installed\n');
    process.exit(1);
  }

  process.stdout.write(`Installing ${status.engines.map((e) => engines[e].config.name).join(', ')}\n`);

  for (const engine of status.engines) {
    await installEngine(engine);
  }
}());
