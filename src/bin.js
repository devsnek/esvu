#!/usr/bin/env node

'use strict';

/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */

const fs = require('fs');
const path = require('path');
const ora = require('ora');
const inquirer = require('inquirer');
const { argv } = require('yargs');
const { engines } = require('.');
const { ESVU_PATH } = require('./common');
const packageJson = require('../package.json');

process.stdout.write(`esvu v${packageJson.version}\n`);

const STATUS_PATH = path.join(ESVU_PATH, 'status.json');

async function promptForEngines() {
  const { selectedEngines } = await inquirer.prompt({
    name: 'selectedEngines',
    type: 'checkbox',
    message: 'Which engines would you like to install?',
    choices: Object.keys(engines).map((e) => ({
      name: engines[e].config.name,
      value: e,
      checked: true,
    })),
  });
  return selectedEngines;
}

(async function main() {
  if (process.argv.find((a) => a === '--help' || a === '-h')) {
    process.stdout.write(`
USAGE:
    esvu            Update engines
    esvu [OPTIONS]

OPTIONS:
    --help          Show this help message
`);
    return;
  }

  let status;
  try {
    const source = await fs.promises.readFile(STATUS_PATH, 'utf8');
    status = JSON.parse(source);
  } catch {
    let selectedEngines;
    if (argv.engines) {
      if (argv.engines === 'all') {
        selectedEngines = Object.keys(engines);
      } else {
        selectedEngines = argv.engines.split(',');
      }
    } else {
      selectedEngines = await promptForEngines();
    }
    status = {
      engines: selectedEngines,
      installed: {},
    };
  }

  if (!status.engines || status.engines.length === 0) {
    process.stdout.write('No engines are configured to be installed\n');
    process.exit(1);
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

  process.stdout.write(`Installing ${status.engines.join(', ')}\n`);

  for (const engine of status.engines) {
    const Installer = engines[engine];

    const spinner = ora({ prefixText: Installer.config.name });
    spinner.start();

    const version = await Installer.resolveVersion('latest');
    if (status.installed[engine] === version) {
      spinner.succeed(`version ${version}`);
      continue;
    }

    try {
      let first = true;
      await Installer.install(version, {
        update(t) {
          if (first) {
            first = false;
          } else {
            process.stdout.write('\n');
          }
          spinner.text = t;
          spinner.render();
        },
        pass(t) {
          process.stdout.write('\n');
          spinner.succeed(t);
        },
      });
      status.installed[engine] = version;
    } catch (e) {
      process.stdout.write('\n');
      spinner.fail(e.stack);
      process.exitCode = 1;
    }
  }
}());
