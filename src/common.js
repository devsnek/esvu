'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');
const extractZip = require('extract-zip');
const tar = require('tar');

const ESVU_PATH = path.join(os.homedir(), '.esvu');

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

function guessPlatform() {
  const platform = os.platform();
  const arch = os.arch().includes('64') ? '64' : '32';
  return `${platform}${arch}`;
}

function unzip(from, to) {
  return new Promise((resolve, reject) => {
    extractZip(from, { dir: to }, (e) => {
      if (e) {
        reject(e);
      } else {
        resolve();
      }
    });
  });
}

function untar(from, to) {
  return tar.extract({ file: from, cwd: to });
}

module.exports = {
  ESVU_PATH,
  fileExists,
  ensureDirectory,
  symlink,
  platform: guessPlatform(),
  unzip,
  untar,
};
