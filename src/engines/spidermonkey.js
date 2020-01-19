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
    case 'linx32':
      return 'linux-i686';
    case 'linux64':
      return 'linux-x86_64';
    case 'win32':
      return 'win32';
    case 'win64':
      return 'win64';
    default:
      throw new Error(`No SpiderMonkey builds available for ${platform}`);
  }
}

class SpiderMonkeyInstaller extends Installer {
  constructor(...args) {
    super(...args);

    this.binPath = undefined;
  }

  static async resolveVersion(version) {
    if (version === 'latest') {
      const data = await fetch('https://product-details.mozilla.org/1.0/firefox_history_development_releases.json')
        .then((r) => r.json());
      let latestVersion = 0;
      let latestTimestamp = 0;
      for (const [key, value] of Object.entries(data)) {
        const timestamp = +new Date(value);
        if (latestTimestamp < timestamp) {
          latestTimestamp = timestamp;
          latestVersion = key;
        }
      }
      return latestVersion;
    }
    return version;
  }

  getDownloadURL(version) {
    return `https://archive.mozilla.org/pub/firefox/releases/${version}/jsshell/jsshell-${getFilename()}.zip`;
  }

  extract(from, to) {
    return unzip(from, to);
  }

  async install() {
    switch (platform) {
      case 'darwin64':
        await this.registerAssets('*.dylib');
        await this.registerBinary('js', 'sm');
        await this.registerBinary('js', 'spidermonkey');
        break;
      case 'linux32':
      case 'linux64':
        await this.registerAssets('*.so');
        this.binPath = await this.registerBinary('js', 'spidermonkey');
        await this.registerScript('sm', `LD_LIBRARY_PATH="${this.finalLocation}" "${this.binPath}"`);
        break;
      case 'win32':
      case 'win64': {
        await this.registerAssets('*.dll');
        const sm = await this.registerAsset('js.exe');
        this.binPath = await this.registerScript('spidermonkey', `"${sm}"`);
        await this.registerScript('sm', `"${sm}"`);
        break;
      }
      default:
        throw new RangeError(`Unknown platform ${platform}`);
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

SpiderMonkeyInstaller.config = {
  name: 'SpiderMonkey',
  id: 'jsshell',
};

module.exports = SpiderMonkeyInstaller;
