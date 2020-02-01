'use strict';

/* eslint-disable no-await-in-loop */

const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const stream = require('stream');
const path = require('path');
const glob = require('glob');
const fetch = require('node-fetch');
const { ESVU_PATH, ensureDirectory, symlink, platform, rmdir } = require('./common');
const Logger = require('./logger');

function hash(string) {
  const h = crypto.createHash('md5');
  h.update(string);
  return h.digest('hex');
}

class EngineInstaller {
  constructor(version) {
    this.version = version;
    this.downloadPath = undefined;
    this.extractedPath = undefined;
    this.installPath = path.join(ESVU_PATH, 'engines', this.constructor.config.id);
    this.binEntries = [];
  }

  static async install(requestedVersion, status) {
    const logger = new Logger(this.config.name);

    if (!status.selectedEngines.includes(this.config.id)) {
      status.selectedEngines.push(this.config.id);
    }

    logger.info('Checking version...');

    const version = await this.resolveVersion(requestedVersion);
    if (status.installed[this.config.id]
        && version === status.installed[this.config.id].version) {
      logger.succeed('Up to date');
      return;
    }

    const installer = new this(version);

    if (this.config.externalRequirements) {
      logger.warn('There are external requirements that may need to be installed:');
      this.config.externalRequirements.forEach((e) => {
        logger.warn(`  * ${e.name} - ${e.url}`);
      });
    }

    logger.info(`Installing version ${version}`);

    const url = await installer.getDownloadURL(version);
    logger.info(`Downloading ${url}`);
    installer.downloadPath = await fetch(url)
      .then(async (r) => {
        const rURL = new URL(r.url);
        const l = path.join(os.tmpdir(), hash(url) + path.extname(rURL.pathname));
        const sink = fs.createWriteStream(l);
        const progress = logger.progress(+r.headers.get('content-length'));
        await new Promise((resolve, reject) => {
          r.body
            .pipe(new (class extends stream.Transform {
              constructor(...args) {
                super(...args);
                this.count = 0;
              }
              _transform(chunk, encoding, cb) {
                this.count += chunk.length;
                progress.update(this.count);
                this.push(chunk);
                cb(null);
              }
              _flush(cb) {
                cb(null);
              }
            })())
            .pipe(sink)
            .once('error', reject)
            .once('finish', resolve);
        });
        progress.stop();
        return l;
      });
    installer.extractedPath = `${installer.downloadPath}-extracted`;

    logger.info(`Extracting ${installer.downloadPath}`);
    await ensureDirectory(installer.installPath);
    await ensureDirectory(path.join(ESVU_PATH, 'bin'));
    await installer.extract();

    logger.info(`Installing ${installer.extractedPath}`);
    await installer.install();

    logger.info('Testing...');
    await installer.test();

    await installer.cleanup();

    status.installed[this.config.id] = {
      version,
      binEntries: installer.binEntries,
    };

    logger.succeed(`Installed with bin entries: ${installer.binEntries.join(', ')}`);
  }

  static async uninstall(status) {
    const logger = new Logger(this.config.name);
    logger.info('Uninstalling...');

    // Delete bin entries and engine assets
    await Promise.all([
      status.installed[this.config.id]
      && status.installed[this.config.id].binEntries
      && status.installed[this.config.id].binEntries.map((b) =>
        fs.promises.unlink(path.join(ESVU_PATH, 'bin', b))),

      rmdir(path.join(ESVU_PATH, 'engines', this.config.id)),
    ]);

    // Remove from status.selectedEngines
    status.selectedEngines.splice(status.selectedEngines.indexOf(this.config.id), 1);

    delete status.installed[this.config.id];

    logger.succeed('Removed assets and bin entries');
  }

  static isSupported() {
    if (this.config.supported) {
      return this.config.supported.includes(platform);
    }
    return true;
  }

  static shouldInstallByDefault() {
    return this.isSupported();
  }

  cleanup() {
    return Promise.all([
      fs.promises.unlink(this.downloadPath),
      rmdir(this.extractedPath),
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
    const bin = path.join(ESVU_PATH, 'bin', name);
    await symlink(from, bin);
    this.binEntries.push(name);
    return bin;
  }

  async registerScript(name, body) {
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
    this.binEntries.push(name);
    return full;
  }
}

module.exports = EngineInstaller;
