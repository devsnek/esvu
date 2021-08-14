'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');
const extractZip = require('extract-zip');
const tar = require('tar');
const rimraf = require('rimraf');

const ESVU_PATH = (() => {
  const NEW_ESVU_PATH = process.env.ESVU_PATH || path.join(process.env.XDG_DATA_HOME || os.homedir(), '.esvu');
  const OLD_ESVU_PATH = path.join(os.homedir(), '.esvu');

  try {
    fs.statSync(path.join(OLD_ESVU_PATH, 'status.json'));
    return OLD_ESVU_PATH;
  } catch {
    return NEW_ESVU_PATH;
  }
})();

const STATUS_PATH = path.join(ESVU_PATH, 'status.json');

async function fileExists(file) {
  try {
    await fs.promises.stat(file);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(dir) {
  if (!(await fileExists(dir))) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

async function symlink(target, dest) {
  try {
    await fs.promises.unlink(dest);
  } catch {
    // x
  }
  await fs.promises.symlink(target, dest);
}

function rmdir(dir) {
  return new Promise((resolve, reject) => {
    rimraf(dir, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function guessPlatform() {
  return `${os.platform()}-${os.arch()}`;
}

async function unzip(from, to) {
  await rmdir(to);
  await extractZip(from, { dir: to });
}

async function untar(from, to) {
  await rmdir(to);
  await ensureDirectory(to);
  await tar.extract({ file: from, cwd: to });
}

module.exports = {
  ESVU_PATH,
  STATUS_PATH,
  fileExists,
  ensureDirectory,
  symlink,
  rmdir,
  platform: guessPlatform(),
  unzip,
  untar,
};
