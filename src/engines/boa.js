'use strict';

const assert = require('assert');
const execa = require('execa');
const { join } = require('path');
const fetch = require('node-fetch');
const { copyFileSync, chmodSync, existsSync, mkdirSync } = require('fs');
const Installer = require('../installer');
const { platform } = require('../common');

const binaryName = platform.startsWith('win') ? 'boa.exe' : 'boa';

function getFilename() {
  switch (platform) {
    case 'darwin-x64':
      return 'boa-macos-amd64';
    case 'linux-x64':
      return 'boa-linux-amd64';
    case 'win32-x64':
      return 'boa-windows-amd64';
    default:
      throw new Error(`No Boa builds available for ${platform}`);
  }
}

class BoaInstaller extends Installer {
  constructor(...args) {
    super(...args);
    this.binPath = undefined;
  }

  static resolveVersion(version) {
    if (version === 'latest') {
      return fetch('https://api.github.com/repos/boa-dev/boa/releases/latest')
        .then((r) => r.json())
        .then((r) => r.tag_name);
    }
    return version;
  }

  getDownloadURL(version) {
    return `https://github.com/boa-dev/boa/releases/download/${version}/${getFilename()}`;
  }

  async extract() {
    // The file is not zipped so we don't need to do any extraction here
    // The file doesn't seem to be executable so we need to set it manually
    chmodSync(this.downloadPath, '755');
    // Windows will fail if the extractedPath doesn't exist
    if (!existsSync(this.extractedPath)) {
      mkdirSync(this.extractedPath);
    }
    return copyFileSync(this.downloadPath, join(this.extractedPath, binaryName));
  }

  async install() {
    this.binPath = await this.registerBinary(binaryName);
  }

  async test() {
    const program = 'console.log("42");';
    const output = '42\nundefined';

    assert.strictEqual(
      (await execa(this.binPath, [], { input: program })).stdout,
      output,
    );
  }
}

BoaInstaller.config = {
  name: 'Boa',
  id: 'boa',
  supported: [
    'linux-x64',
    'win32-x64',
    'darwin-x64',
  ],
};

module.exports = BoaInstaller;
