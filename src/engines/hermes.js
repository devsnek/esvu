'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const fetch = require('node-fetch');
const execa = require('execa');
const Installer = require('../installer');
const { platform, untar } = require('../common');

function getFilename() {
  switch (platform) {
    case 'linux-x64':
      return 'linux';
    case 'darwin-x64':
    case 'darwin-arm64':
      return 'darwin';
    case 'win32-x64':
      return 'windows';
    default:
      throw new Error(`No Hermes builds available for ${platform}`);
  }
}

class HermesInstaller extends Installer {
  constructor(...args) {
    super(...args);

    this.binPath = undefined;
  }

  static resolveVersion(version) {
    if (version === 'latest') {
      return fetch('https://registry.npmjs.org/hermes-engine')
        .then((r) => r.json())
        .then((b) => b['dist-tags'].latest);
    }
    return version;
  }

  getDownloadURL(version) {
    return `https://github.com/facebook/hermes/releases/download/v${version}/hermes-cli-${getFilename()}-v${version}.tar.gz`;
  }

  extract() {
    return untar(this.downloadPath, this.extractedPath);
  }

  async install() {
    if (platform.startsWith('win')) {
      await this.registerAssets('*.dll');
      const hermes = await this.registerAsset('hermes.exe');
      this.binPath = await this.registerScript('hermes', `"${hermes}"`);
    } else {
      this.binPath = await this.registerBinary('hermes');
      await this.registerBinary('hermes');
    }
  }

  async test() {
    const program = 'print("42");';
    const output = '42';

    const file = path.join(os.tmpdir(), 'esvu_hermes_test.js');
    await fs.promises.writeFile(file, program);

    assert.strictEqual(
      (await execa(this.binPath, [file])).stdout,
      output,
    );
  }
}

HermesInstaller.config = {
  name: 'Hermes',
  id: 'hermes',
  supported: ['win32-x64', 'darwin-x64'],
};

module.exports = HermesInstaller;
