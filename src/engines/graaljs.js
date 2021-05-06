'use strict';

const fetch = require('node-fetch');
const assert = require('assert');
const execa = require('execa');
const Installer = require('../installer');
const { platform, untar, unzip } = require('../common');

function getFilename() {
  switch (platform) {
    case 'darwin-x64':
      return 'darwin-amd64';
    case 'linux-x64':
      return 'linux-amd64';
    case 'win32-x64':
      return 'windows-amd64';
    default:
      throw new Error(`No GraalJS builds available for ${platform}`);
  }
}

class GraalJSInstaller extends Installer {
  constructor(...args) {
    super(...args);

    this.binPath = undefined;
  }

  static shouldInstallByDefault() {
    // Graal VM archives are >400mb, so don't download by default.
    return false;
  }

  static async resolveVersion(version) {
    if (version === 'latest') {
      const body = await fetch('https://api.github.com/repos/graalvm/graalvm-ce-builds/releases')
        .then((r) => r.json());
      return body
        .filter((b) => !b.prerelease)
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())[0]
        .tag_name.slice(3);
    }
    return version;
  }

  async getDownloadURL(version) {
    return `https://github.com/graalvm/graalvm-ce-builds/releases/download/vm-${version}/graalvm-ce-java11-${getFilename()}-${version}.tar.gz`;
  }

  async extract() {
    if (platform.startsWith('win')) {
      await unzip(this.downloadPath, this.extractedPath);
    } else {
      await untar(this.downloadPath, this.extractedPath);
    }
  }

  async install() {
    const root = `graalvm-ce-java11-${this.version}`;
    if (platform === 'darwin-x64') {
      this.binPath = await this.registerBinary(`${root}/Contents/Home/languages/js/bin/js`, 'graaljs');
    } else {
      this.binPath = await this.registerBinary(`${root}/languages/js/bin/js`, 'graaljs');
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

GraalJSInstaller.config = {
  name: 'GraalJS',
  id: 'graaljs',
  supported: [
    'linux-x64', 'win32-x64', 'darwin-x64',
  ],
};

module.exports = GraalJSInstaller;
