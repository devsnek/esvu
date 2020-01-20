'use strict';

/* eslint-disable no-await-in-loop */

const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const path = require('path');
const glob = require('glob');
const fetch = require('node-fetch');
const { ESVU_PATH, ensureDirectory, symlink, platform } = require('./common');

function hash(string) {
  const h = crypto.createHash('md5');
  h.update(string);
  return h.digest('hex');
}

class EngineInstaller {
  constructor(status) {
    this.finalLocation = path.join(ESVU_PATH, 'engines', this.constructor.config.id);
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
    const location = await fetch(url)
      .then(async (r) => {
        const l = path.join(os.tmpdir(), hash(url));
        const sink = fs.createWriteStream(l);
        await new Promise((resolve, reject) => {
          r.body.pipe(sink)
            .once('error', reject)
            .once('finish', resolve);
        });
        return l;
      });
    status.update(`Extracting from ${location}`);
    await ensureDirectory(installer.finalLocation);
    await ensureDirectory(path.join(ESVU_PATH, 'bin'));
    installer.extractedLocation = `${location}-extracted`;
    await installer.extract(location, installer.extractedLocation);
    status.update(`Installing from ${installer.extractedLocation}`);
    await installer.install();
    status.update('Testing engine');
    await installer.test();
    status.pass(`Installed version ${version}`);
  }

  async registerAssets(pattern) {
    const full = path.join(this.extractedLocation, pattern);
    const files = await new Promise((resolve, reject) => {
      glob(full, { nodir: true }, (err, list) => {
        if (err) {
          reject(err);
        } else {
          resolve(list);
        }
      });
    });
    for (const file of files) {
      await this.registerAsset(path.relative(this.extractedLocation, file));
    }
  }

  async registerAsset(name) {
    this.status.update(`Registering asset ${name}`);
    const full = path.join(this.extractedLocation, name);
    const out = path.join(this.finalLocation, name);
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
