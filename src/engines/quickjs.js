'use strict';

const assert = require('assert');
const fetch = require('node-fetch');
const execa = require('execa');
const Installer = require('../installer');
const { platform, unzip } = require('../common');

function getFilename() {
  switch (platform) {
    case 'linux-x64':
      return 'linux-x86_64';
    case 'linux-ia32':
      return 'linux-i686';
    case 'win32-ia32':
      return 'win-i686';
    case 'win32-x64':
      return 'win-x86_64';
    default:
      throw new Error(`No QuickJS builds available for ${platform}`);
  }
}

class QuickJSInstaller extends Installer {
  constructor(...args) {
    super(...args);

    this.binPath = undefined;
  }

  static resolveVersion(version) {
    if (version === 'latest') {
      return fetch('https://bellard.org/quickjs/binary_releases/LATEST.json')
        .then((r) => r.json())
        .then((b) => b.version);
    }
    return version;
  }

  getDownloadURL(version) {
    if (platform === 'darwin-x64') {
      return 'https://github.com/napi-bindings/quickjs-build/releases/download/5.2.0/qjs-macOS.zip';
    }
    return `https://bellard.org/quickjs/binary_releases/quickjs-${getFilename()}-${version}.zip`;
  }

  extract() {
    return unzip(this.downloadPath, this.extractedPath);
  }

  async install() {
    if (platform === 'darwin-x64') {
      this.binPath = await this.registerBinary('quickjs');
      await this.registerBinary('run-test262', 'quickjs-run-test262');
    } else if (platform.startsWith('win')) {
      await this.registerAsset('libwinpthread-1.dll');
      const qjs = await this.registerAsset('qjs.exe');
      this.binPath = await this.registerScript('qjs', `"${qjs}"`);
    } else {
      this.binPath = await this.registerBinary('qjs', 'quickjs');
      await this.registerBinary('run-test262', 'quickjs-run-test262');
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

QuickJSInstaller.config = {
  name: 'QuickJS',
  id: 'qjs',
  supported: [
    'linux-ia32', 'linux-x64',
    'win32-ia32', 'win32-x64',
    'darwin-x64',
  ],
};

module.exports = QuickJSInstaller;
