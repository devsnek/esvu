#!/usr/bin/env node

'use strict';

const fs = require('fs');
const yargs = require('yargs');
const inquirer = require('inquirer');
const Logger = require('./logger');
const { STATUS_PATH } = require('./common');
const esvu = require('.');
const packageJson = require('../package.json');

const { argv } = yargs
  .command('install <engine>', 'Install <engine>')
  .command('uninstall <engine>', 'Uninstall <engine>')
  .command('update <engine>', 'Update <engine>')
  .option('engines');

const logger = new Logger('esvu');

logger.info(`version ${packageJson.version}`);

let status;
async function loadStatus(promptIfEmpty) {
  if (status) {
    return;
  }

  try {
    const source = await fs.promises.readFile(STATUS_PATH, 'utf8');
    status = JSON.parse(source);
  } catch {
    let selectedEngines = [];

    // --engines=name1,...
    // --engines=all
    // --engines=all+name1,...
    if (argv.engines) {
      if (argv.engines.startsWith('all')) {
        selectedEngines = Object.keys(esvu.engines)
          .filter((e) => esvu.engines[e].isSupported());
        const additional = argv.engines.split('+')[1];
        if (additional) {
          selectedEngines.push(...additional.split(','));
        }
      } else {
        selectedEngines = argv.engines.split(',');
      }
    } else if (promptIfEmpty) {
      ({ selectedEngines } = await inquirer.prompt({
        name: 'selectedEngines',
        type: 'checkbox',
        message: 'Select engines to install',
        choices: Object.keys(esvu.engines).map((e) => {
          const engine = esvu.engines[e];
          return {
            name: engine.config.name,
            value: engine.config.id,
            checked: engine.shouldInstallByDefault(),
          };
        }),
      }));
    }

    status = {
      selectedEngines,
      installed: {},
    };
  }

  const onExit = () => {
    fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));
    process.exit();
  };
  process
    .on('exit', onExit)
    .on('SIGINT', onExit);
}

function getInstaller(name, verifyInstalled) {
  const Installer = esvu.getInstaller(name);
  if (!Installer) {
    logger.fatal(`Unknown engine: ${name}`);
    process.exit(1);
  }
  if (verifyInstalled && !status.selectedEngines.includes(Installer.config.id)) {
    logger.fatal(`${Installer.config.name} is not installed`);
    process.exit(1);
  }
  return Installer;
}

async function installEngine(name) {
  await loadStatus(false);

  const Installer = getInstaller(name, false);
  await Installer.install('latest', status);
}

async function updateEngine(name) {
  await loadStatus(false);
  const Installer = getInstaller(name, true);
  await Installer.install('latest', status);
}

async function uninstallEngine(name) {
  await loadStatus(false);
  const Installer = getInstaller(name, true);
  await Installer.uninstall(status);
}

async function updateAll() {
  await loadStatus(true);

  if (status.selectedEngines.length === 0) {
    logger.fatal('No engines are selected to install');
    process.exit(1);
  }

  for (const engine of status.selectedEngines) {
    await updateEngine(engine); // eslint-disable-line no-await-in-loop
  }
}

(async function main() {
  switch (argv._[0]) {
    case 'install':
      await installEngine(argv.engine);
      break;
    case 'update':
      await updateEngine(argv.engine);
      break;
    case 'uninstall':
      await uninstallEngine(argv.engine);
      break;
    default:
      await updateAll();
      break;
  }
}());
