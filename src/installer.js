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
  constructor(version, isLatest) {
    this.version = version;
    this.isLatest = isLatest;
    this.downloadPath = undefined;
    this.extractedPath = undefined;
    this.installPath = path.join(ESVU_PATH, 'engines', this.constructor.config.id);
    if (!isLatest) {
      this.installPath += `-${version}`;
    }
    this.binEntries = [];
  }

  static async install(requestedVersion, status) {
    const logger = new Logger(this.config.name);

    if (requestedVersion === 'latest' && !status.selectedEngines.includes(this.config.id)) {
      status.selectedEngines.push(this.config.id);
    }

    logger.info('Checking version...');

    const version = await this.resolveVersion(requestedVersion);
    const INSTALLED_ID = requestedVersion === 'latest' ? this.config.id : `${this.config.id}-${version}`;
    if (status.installed[INSTALLED_ID]
        && version === status.installed[INSTALLED_ID].version) {
      logger.succeed('Up to date');
      return;
    }

    const installer = new this(version, requestedVersion === 'latest');

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
        if (!r.ok) {
          throw new Error(`Got ${r.status}`);
        }
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

    status.installed[INSTALLED_ID] = {
      version,
      binEntries: installer.binEntries,
    };

    logger.succeed(`Installed with bin entries: ${installer.binEntries.join(', ')}`);
  }

  static async uninstall(version, status) {
    const logger = new Logger(this.config.name);
    logger.info('Uninstalling...');

    if (version !== 'latest') {
      version = await this.resolveVersion(version);
    }

    const INSTALLED_ID = version === 'latest' ? this.config.id : `${this.config.id}-${version}`;

    // Delete bin entries and engine assets
    await Promise.all([
      status.installed[INSTALLED_ID]
      && status.installed[INSTALLED_ID].binEntries
      && status.installed[INSTALLED_ID].binEntries.map((b) =>
        fs.promises.unlink(path.join(ESVU_PATH, 'bin', b))),

      rmdir(path.join(ESVU_PATH, 'engines', INSTALLED_ID)),
    ]);

    // Remove from status.selectedEngines
    if (version === 'latest') {
      status.selectedEngines.splice(status.selectedEngines.indexOf(this.config.id), 1);
    }

    delete status.installed[INSTALLED_ID];

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
    if (!this.isLatest) {
      name += `-${this.version}`;
    }
    const bin = path.join(ESVU_PATH, 'bin', name);
    await symlink(from, bin);
    this.binEntries.push(name);
    return bin;
  }

  async registerScript(name, body) {
    if (!this.isLatest) {
      name += `-${this.version}`;
    }
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
