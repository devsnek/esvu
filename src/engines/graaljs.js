'use strict';

const fetch = require('node-fetch');
const assert = require('assert');
const execa = require('execa');
const Installer = require('../installer');
const { platform, untar, unzip } = require('../common');

function getFilename() {
  switch (platform) {
    case 'darwin-x64':
      return 'macos-amd64';
    case 'linux-x64':
      return 'linux-amd64';
    case 'win32-x64':
      return 'windows-amd64';
    default:
      throw new Error(`No GraalJS builds available for ${platform}`);
  }
}

function getArchiveExtension() {
  return platform.startsWith('win') ? '.zip' : '.tar.gz';
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
      const body = await fetch('https://api.github.com/repos/oracle/graaljs/releases')
        .then((r) => r.json());
      return body
        .filter((b) => !b.prerelease)
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())[0]
        .tag_name.slice(3);
    }
    return version;
  }

  async getDownloadURL(version) {
    return `https://github.com/oracle/graaljs/releases/download/vm-${version}/graaljs-${version}-${getFilename()}${getArchiveExtension()}`;
  }

  async extract() {
    if (platform.startsWith('win')) {
      await unzip(this.downloadPath, this.extractedPath);
    } else {
      await untar(this.downloadPath, this.extractedPath);
    }
  }

  async install() {
    const root = `graaljs-${this.version}-${getFilename()}`;
    let graaljs;
    if (platform === 'darwin-x64') {
      await this.registerAsset(`${root}/Contents/Home/lib/libjsvm.dylib`);
      graaljs = await this.registerAsset(`${root}/Contents/Home/bin/js`);
    } else if (platform === 'win32-x64') {
      await this.registerAsset(`${root}/lib/jsvm.dll`);
      graaljs = await this.registerAsset(`${root}/bin/js.exe`);
    } else {
      await this.registerAsset(`${root}/lib/libjsvm.so`);
      graaljs = await this.registerAsset(`${root}/bin/js`);
    }
    this.binPath = await this.registerScript('graaljs', `${graaljs}`);
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
