'use strict';

const assert = require('assert');
const path = require('path');
const fetch = require('node-fetch');
const execa = require('execa');
const Installer = require('../installer');
const { untar } = require('../common');

class Engine262Installer extends Installer {
  constructor(...args) {
    super(...args);

    this.binPath = undefined;
  }

  static resolveVersion(version) {
    if (version === 'latest') {
      return fetch('https://registry.npmjs.org/@engine262/engine262')
        .then((r) => r.json())
        .then((b) => b['dist-tags'].latest);
    }
    return version;
  }

  getDownloadURL(version) {
    return fetch('https://registry.npmjs.org/@engine262/engine262')
      .then((r) => r.json())
      .then((b) => b.versions[version].dist.tarball);
  }

  async extract() {
    await untar(this.downloadPath, this.installPath);
  }

  async install() {
    const bin = path.join(this.installPath, 'package', 'bin', 'engine262.js');
    this.binPath = await this.registerBinarySymlink(bin, 'engine262');
  }

  async test() {
    const program = 'print("42");';
    const output = '42';

    assert.strictEqual(
      (await execa(this.binPath, [], { input: program })).stdout,
      output,
    );
  }
}

Engine262Installer.config = {
  name: 'engine262',
  id: 'engine262',
  externalRequirements: [
    {
      name: 'Node.js',
      url: 'https://nodejs.org/',
    },
  ],
};

module.exports = Engine262Installer;
