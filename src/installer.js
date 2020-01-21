'use strict';

/* eslint-disable no-await-in-loop */

const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const path = require('path');
const glob = require('glob');
const fetch = require('node-fetch');
const rimraf = require('rimraf');
const { ESVU_PATH, ensureDirectory, symlink, platform } = require('./common');

function hash(string) {
  const h = crypto.createHash('md5');
  h.update(string);
  return h.digest('hex');
}

class EngineInstaller {
  constructor(status) {
    this.downloadPath = undefined;
    this.extractedPath = undefined;
    this.installPath = path.join(ESVU_PATH, 'engines', this.constructor.config.id);
    this.status = status;
  }

  static async install(version, status) {
    const installer = new this(status);
    if (this.config.externalRequirements) {
      process.stdout.write(`\n! ${this.config.name} has external requirements which may need to be installed separately:\n`);
      this.config.externalRequirements.forEach((e) => {
        process.stdout.write(`  ${e.name} - ${e.url}\n`);
      });
    }

    status.update(`Installing version ${version}`);

    const url = await installer.getDownloadURL(version);
    status.update(`Downloading ${url}`);
    installer.downloadPath = await fetch(url)
      .then(async (r) => {
        const rURL = new URL(r.url);
        const l = path.join(os.tmpdir(), hash(url) + path.extname(rURL.pathname));
        const sink = fs.createWriteStream(l);
        await new Promise((resolve, reject) => {
          r.body.pipe(sink)
            .once('error', reject)
            .once('finish', resolve);
        });
        return l;
      });
    installer.extractedPath = `${installer.downloadPath}-extracted`;

    status.update(`Extracting from ${installer.downloadPath}`);
    await ensureDirectory(installer.installPath);
    await ensureDirectory(path.join(ESVU_PATH, 'bin'));
    await installer.extract();

    status.update(`Installing from ${installer.extractedPath}`);
    await installer.install();

    status.update('Testing engine');
    await installer.test();

    await installer.cleanup();
    status.pass(`Installed version ${version}`);
  }

  static isSupported() {
    if (this.config.supported) {
      return this.config.supported.includes(platform);
    }
    return true;
  }

  cleanup() {
    return Promise.all([
      fs.promises.unlink(this.downloadPath),
      new Promise((resolve, reject) => {
        rimraf(this.extractedPath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }),
    ]);
  }

  async registerAssets(pattern) {
    const full = path.join(this.extractedPath, pattern);
    const files = await new Promise((resolve, reject) => {
      glob(full, { nodir: true }, (err, list) => {
        if (err) {
          reject(err);
        } else {
          resolve(list);
        }
      });
    });
    await Promise.all(files.map((file) =>
      this.registerAsset(path.relative(this.extractedPath, file))));
  }

  async registerAsset(name) {
    this.status.update(`Registering asset ${name}`);
    const full = path.join(this.extractedPath, name);
    const out = path.join(this.installPath, name);
    await ensureDirectory(path.dirname(out));
    await fs.promises.copyFile(full, out);
    return out;
  }

  async registerBinary(name, alias = name) {
    const full = await this.registerAsset(name);
    return this.registerBinarySymlink(full, path.basename(alias));
  }

  async registerBinarySymlink(from, name) {
    this.status.update(`Registering binary ${name}`);
    const bin = path.join(ESVU_PATH, 'bin', name);
    await symlink(from, bin);
    return bin;
  }

  async registerScript(name, body) {
    this.status.update(`Registering script ${name}`);
    let source;
    if (platform.startsWith('win')) {
      name += '.cmd';
      source = `@echo off\r\n${body} %*\r\n`;
    } else {
      source = `#!/usr/bin/env bash\n${body} "$@"\n`;
    }
    const full = path.join(ESVU_PATH, 'bin', name);
    await fs.promises.writeFile(full, source, {
      mode: 0o755,
    });
    return full;
  }
}

module.exports = EngineInstaller;
