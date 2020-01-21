'use strict';

const assert = require('assert');
const fetch = require('node-fetch');
const execa = require('execa');
const Installer = require('../installer');
const { platform, unzip } = require('../common');

function getFilename() {
  switch (platform) {
    case 'darwin64':
      return 'mac';
    case 'linux32':
      return 'lin32';
    case 'linux64':
      return 'lin64';
    case 'win32':
    case 'win64':
      return 'win';
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
      const body = await fetch('https://github.com/Moddable-OpenSource/moddable-xst/releases')
        .then((r) => r.text());
      const match = /href="\/Moddable-OpenSource\/moddable-xst\/releases\/tag\/v([^"]+)">/.exec(body);
      return match[1];
    }
    return version;
  }

  getDownloadURL(version) {
    return `https://github.com/Moddable-OpenSource/moddable-xst/releases/download/v${version}/xst-${getFilename()}.zip`;
  }

  extract(from, to) {
    return unzip(from, to);
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
    'linux32', 'linux64',
    'win32', 'win64',
    'darwin64',
  ],
};

module.exports = XSInstaller;
