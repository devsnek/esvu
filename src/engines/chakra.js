'use strict';

const fs = require('fs');
const assert = require('assert');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch');
const execa = require('execa');
const Installer = require('../installer');
const { platform, unzip, untar } = require('../common');

function getFilename() {
  switch (platform) {
    case 'darwin64':
      return 'osx_x64';
    case 'linux64':
      return 'linux_x64';
    case 'win32':
    case 'win64':
      return 'windows_all';
    default:
      throw new Error(`No Chakra builds available for ${platform}`);
  }
}

class ChakraInstaller extends Installer {
  constructor(...args) {
    super(...args);

    this.binPath = undefined;
  }

  static resolveVersion(version) {
    if (version === 'latest') {
      return fetch('https://aka.ms/chakracore/version')
        .then((r) => r.text())
        .then((t) => t.trim());
    }
    return version;
  }

  getDownloadURL(version) {
    return `https://aka.ms/chakracore/cc_${getFilename()}_${version}`;
  }

  async extract() {
    if (platform.startsWith('win')) {
      await unzip(this.downloadPath, this.extractedPath);
    } else {
      await untar(this.downloadPath, this.extractedPath);
    }
  }

  async install() {
    if (platform.startsWith('win')) {
      const root = platform === 'win32' ? 'x86_release' : 'x64_release';
      await this.registerAssets(`${root}/*.pdb`);
      await this.registerAssets(`${root}/*.dll`);
      const ch = await this.registerAsset(`${root}/ch.exe`);
      await this.registerScript('ch', `"${ch}"`);
      this.binPath = await this.registerScript('chakra', `"${ch}"`);
    } else {
      await this.registerAssets('ChakraCoreFiles/lib/*');
      this.binPath = await this.registerBinary('ChakraCoreFiles/bin/ch', 'chakra');
      await this.registerAsset('ChakraCoreFiles/LICENSE');
    }
  }

  async test() {
    const program = 'print("42");';
    const output = '42';

    const file = path.join(os.tmpdir(), 'esvu_chakra_test.js');
    await fs.promises.writeFile(file, program);

    assert.strictEqual(
      (await execa(this.binPath, [file])).stdout,
      output,
    );
  }
}

ChakraInstaller.config = {
  name: 'Chakra',
  id: 'ch',
  supports: ['linux64', 'darwin64', 'win32', 'win64'],
};

module.exports = ChakraInstaller;
