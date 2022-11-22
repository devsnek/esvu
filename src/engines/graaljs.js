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
    case 'darwin-arm64':
      return 'macos-aarch64';
    case 'linux-arm64':
      return 'linux-aarch64';
    default:
      throw new Error(`No GraalJS builds available for ${platform}`);
  }
}

function getArchiveExtension() {
  return platform.startsWith('win') ? '.zip' : '.tar.gz';
}

class GraalJSVersion {
  constructor(tagName) {
    const match = /((\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\.(\d+))?.*)$/.exec(tagName);
    if (match == null) {
      throw new Error(`Unable to parse version from tag name '${tagName}'`);
    }
    const [, fullVersion, ...parts] = match;
    this.fullVersion = fullVersion;
    this.numParts = parts.filter((s) => s !== undefined).map((s) => parseInt(s, 10));
  }

  static from(a) {
    return a instanceof GraalJSVersion ? a : new GraalJSVersion(a);
  }

  static compare(a, b) {
    a = GraalJSVersion.from(a);
    b = GraalJSVersion.from(b);
    for (let i = 0; i < Math.max(a.numParts.length, b.numParts.length); i += 1) {
      const cmp = Math.sign((a.numParts[i] || 0) - (b.numParts[i] || 0));
      if (cmp !== 0) {
        return cmp;
      }
    }
    return a.fullVersion.localeCompare(b.fullVersion);
  }

  toString() {
    return this.fullVersion;
  }

  get majorVersion() {
    return this.numParts[0];
  }
}

class GraalJSInstaller extends Installer {
  constructor(...args) {
    super(...args);

    this.binPath = undefined;
  }

  static async resolveVersion(version) {
    if (version === 'latest') {
      const body = await fetch('https://api.github.com/repos/oracle/graaljs/releases')
        .then((r) => r.json());
      const versions = body
        .filter((b) => !b.prerelease)
        .map((b) => GraalJSVersion.from(b.tag_name))
        .sort((a, b) => GraalJSVersion.compare(b, a));
      if (versions.length === 0) {
        throw new Error('Could not find a release version');
      }
      return versions[0].toString();
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
    const libjsvm = GraalJSVersion.from(this.version).majorVersion >= 22;
    let graaljs;
    if (platform.startsWith('darwin')) {
      if (libjsvm) {
        await this.registerAsset(`${root}/lib/libjsvm.dylib`);
      }
      graaljs = await this.registerAsset(`${root}/bin/js`);
    } else if (platform.startsWith('win')) {
      if (libjsvm) {
        await this.registerAsset(`${root}/lib/jsvm.dll`);
      }
      graaljs = await this.registerAsset(`${root}/bin/js.exe`);
    } else {
      if (libjsvm) {
        await this.registerAsset(`${root}/lib/libjsvm.so`);
      }
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
  supported: [],
};

module.exports = GraalJSInstaller;
