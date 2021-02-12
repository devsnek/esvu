'use strict';

const fetch = require('node-fetch');
const assert = require('assert');
const execa = require('execa');
const Installer = require('../installer');
const { platform, unzip } = require('../common');

function getFilename(os) {
  switch (os) {
    case 'darwin64':
      return 'mac64';
    case 'linux32':
      return 'linux32';
    case 'linux64':
      return 'linux64';
    case 'win32':
      return 'win32';
    case 'win64':
      return 'win64';
    default:
      throw new Error(`No V8 builds available for ${os}`);
  }
}

class V8Installer extends Installer {
  constructor(...args) {
    super(...args);

    this.v8Path = undefined;
  }

  static async resolveVersion(version) {
    if (version === 'latest') {
      const body = await fetch(`https://storage.googleapis.com/chromium-v8/official/canary/v8-${getFilename(platform)}-rel-latest.json`)
        .then((r) => r.json());
      return body.version;
    }
    const [major, minor, build] = version.split('.');
    if (build) {
      // Assume exact version.
      return version;
    }
    const header = await fetch(`https://raw.githubusercontent.com/v8/v8/${major}.${minor}-lkgr/include/v8-version.h`)
      .then((r) => r.text());
    const match = /#define V8_BUILD_NUMBER (\d+)/.exec(header);
    return `${major}.${minor}.${match[1]}`;
  }

  async getDownloadURL(version) {
    return `https://storage.googleapis.com/chromium-v8/official/canary/v8-${getFilename(platform)}-rel-${version}.zip`;
  }

  extract() {
    return unzip(this.downloadPath, this.extractedPath);
  }

  async install() {
    await this.registerAsset('icudtl.dat');
    const snapshot = await this.registerAsset('snapshot_blob.bin');
    const d8 = await this.registerAsset(platform.startsWith('win') ? 'd8.exe' : 'd8');
    if (this.version.split('.')[0] < 7) {
      await this.registerAsset('natives_blob.bin');
      this.v8Path = await this.registerScript('v8', `\
cd "${this.installPath}"
./d8`);
    } else {
      this.v8Path = await this.registerScript('v8', `"${d8}" --snapshot_blob="${snapshot}"`);
    }
  }

  async test() {
    const program = 'print("42");';
    const output = '42';

    assert.strictEqual(
      (await execa(this.v8Path, ['-e', program])).stdout,
      output,
    );
  }
}

V8Installer.config = {
  name: 'V8',
  id: 'v8',
  supported: [
    'linux32', 'linux64',
    'win32', 'win64',
    'darwin64',
  ],
};

module.exports = V8Installer;
