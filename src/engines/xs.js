'use strict';

const assert = require('assert');
const fetch = require('node-fetch');
const execa = require('execa');
const Installer = require('../installer');
const { platform, unzip } = require('../common');

function getFilename() {
  switch (platform) {
    case 'darwin-x64':
      return 'mac64';
    case 'darwin-arm64':
      return 'mac64arm';
    case 'linux-x64':
      return 'lin64';
    case 'linux-arm64':
      return 'lin64arm';
    case 'win32-x64':
      return 'win64';
    default:
      throw new Error(`No XS builds available for ${platform}`);
  }
}

class XSInstaller extends Installer {
  constructor(...args) {
    super(...args);

    this.binPath = undefined;
  }

  static async resolveVersion(version) {
    if (version === 'latest') {
      const body = await fetch('https://api.github.com/repos/Moddable-OpenSource/moddable/releases')
        .then((r) => r.json());
      return body.find((b) => !b.prerelease).tag_name;
    }
    return version;
  }
  getDownloadURL(version) {
    return `https://github.com/Moddable-OpenSource/moddable/releases/download/${version}/xst-${getFilename(version)}.zip`;
  }

  extract() {
    return unzip(this.downloadPath, this.extractedPath);
  }

  async install() {
    if (platform.startsWith('win')) {
      const xst = await this.registerAsset('xst.exe');
      this.binPath = await this.registerScript('xs', `"${xst}"`);
    } else {
      this.binPath = await this.registerBinary('xst', 'xs');
    }
  }

  async test() {
    const program = 'print("42");';
    const output = '42';

    assert.strictEqual(
      (await execa(this.binPath, ['-e', program])).stdout,
      output,
    );
  }
}

XSInstaller.config = {
  name: 'XS',
  id: 'xs',
  supported: [
    'linux-arm64', 'linux-x64',
    'win32-x64',
    'darwin-arm64', 'darwin-x64',
  ],
};

module.exports = XSInstaller;
