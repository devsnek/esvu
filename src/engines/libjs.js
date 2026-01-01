'use strict';

const assert = require('assert');
const execa = require('execa');
const fetch = require('node-fetch');
const path = require('path');
const Installer = require('../installer');
const { platform, unzip, untar } = require('../common');

function getFilename() {
  switch (platform) {
    case 'linux-x64':
      return 'Linux-x86_64';
    case 'darwin-arm64':
      return 'macOS-arm64';
    default:
      throw new Error(`LibJS does not have binary builds for ${platform}`);
  }
}

class LibJSInstaller extends Installer {
  constructor(...args) {
    super(...args);

    this.binPath = undefined;
  }

  static async resolveVersion(version) {
    const artifactName = `ladybird-js-${getFilename()}`;
    if (version !== 'latest') {
      throw new Error('LibJS only provides binary builds for \'latest\'');
    }

    const artifactId = await fetch('https://api.github.com/repos/ladybirdbrowser/ladybird/actions/artifacts')
      .then((x) => x.json())
      .then((x) => x.artifacts.find((a) => a.name === artifactName))
      .then((x) => x.id)
      .catch(() => {
        throw new Error(`Failed to find any releases for ${artifactName} on LadybirdBrowser/ladybird`);
      });
    return `gh-actions-artifact-${artifactId}`;
  }

  getDownloadURL(version) {
    if (version.startsWith('gh-actions-artifact-')) {
      const artifactId = version.slice('gh-actions-artifact-'.length);
      return `https://nightly.link/ladybirdbrowser/ladybird/actions/artifacts/${artifactId}.zip`;
    }
    throw new Error(`Unexpected version format for ${version}`);
  }

  async extract() {
    await unzip(this.downloadPath, `${this.extractedPath}zip`);
    await untar(path.join(`${this.extractedPath}zip`, `ladybird-js-${getFilename()}.tar.gz`), this.extractedPath);
  }

  async install() {
    const js = await this.registerAsset('bin/js');
    this.binPath = await this.registerScript('ladybird-js', `"${js}"`);
  }

  async test() {
    const program = 'console.log("42")';
    const output = '"42"';

    assert.strictEqual(
      (await execa(this.binPath, ['-c', program])).stdout,
      output,
    );
  }
}

LibJSInstaller.config = {
  name: 'LibJS',
  id: 'libjs',
  supported: [
    'linux-x64',
    'darwin-x64',
    'darwin-arm64',
  ],
};

module.exports = LibJSInstaller;
