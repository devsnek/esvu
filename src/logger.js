'use strict';

const util = require('util');
const chalk = require('chalk');
const { SingleBar } = require('cli-progress');

class Logger {
  constructor(prefix) {
    this.prefix = prefix;
    this.progressBar = undefined;
  }

  write(args, sep = chalk.blue('❯')) {
    if (this.progressBar) {
      this.progressBar.stop();
      this.progressBar = undefined;
    }
    process.stdout.write(`${this.prefix} ${sep} ${util.format(...args)}\n`);
  }

  info(...args) {
    this.write(args);
  }

  warn(...args) {
    this.write(args, chalk.yellow('!'));
  }

  succeed(...args) {
    this.write(args, chalk.green('✔'));
  }

  fatal(...args) {
    this.write(args, chalk.red('✖'));
  }

  progress(total) {
    this.progressBar = new SingleBar({ clearOnComplete: true });
    this.progressBar.start(total, 0);
    return {
      update: (v) => this.progressBar.update(v),
      stop: () => {
        this.progressBar.stop();
        this.progressBar = undefined;
      },
    };
  }
}

module.exports = Logger;
