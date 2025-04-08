'use strict';

const assert = require('assert');
const execa = require('execa');
const { join } = require('path');
const fetch = require('node-fetch');
const { copyFileSync, chmodSync, existsSync, mkdirSync } = require('fs');
const Installer = require('../installer');
const { platform } = require('../common');

const binaryName = platform.startsWith('win') ? 'boa.exe' : 'boa';

function isNightly(version) {
  return version.startsWith('nightly');
}

function getReleaseTag(version) {
  return isNightly(version) ? 'nightly' : version;
}

function getFilename(version) {
  switch (platform) {
    case 'darwin-x64':
      return isNightly(version) ? 'boa-x86_64-apple-darwin' : 'boa-macos-amd64';
    case 'linux-x64':
      return isNightly(version) ? 'boa-x86_64-unknown-linux-gnu' : 'boa-linux-amd64';
    case 'win32-x64':
      return isNightly(version) ? 'boa-x86_64-pc-windows-msvc.exe' : 'boa-windows-amd64.exe';
    case 'darwin-arm64':
      if (isNightly(version)) {
        return 'boa-aarch64-apple-darwin';
      }
      // fall through
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
      // Boa has nightly releases under the 'nightly' tag on GitHub, which are
      // updated instead of making a new release for each one. Tag the version
      // with the time the tag was last updated.
      return fetch('https://api.github.com/repos/boa-dev/boa/releases/tags/nightly')
        .then((r) => r.json())
        .then((r) => `nightly-${r.updated_at}`);
    }
    return version;
  }

  getDownloadURL(version) {
    return `https://github.com/boa-dev/boa/releases/download/${getReleaseTag(version)}/${getFilename(version)}`;
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
    'darwin-arm64',
  ],
};

module.exports = BoaInstaller;
