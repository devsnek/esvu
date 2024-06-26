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
    case 'darwin-x64':
      return 'macOS-universal2';
    case 'darwin-arm64':
      return 'macOS-universal2';
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
      .then((x) => x.artifacts.filter((a) => a.name === artifactName))
      .then((x) => x[0].id)
      .catch(() => {
        throw new Error(`Failed to find any releases for ${artifactName} on LadybirdBrowser/ladybird`);
      });
    const runId = await fetch('https://api.github.com/repos/ladybirdbrowser/ladybird/actions/runs?event=push&branch=master&status=success')
      .then((x) => x.json())
      .then((x) => x.workflow_runs.filter((a) => a.name === 'Package the js repl as a binary artifact'))
      .then((x) => x.sort((a, b) => a.check_suite_id > b.check_suite_id))
      .then((x) => x[0].check_suite_id)
      .catch(() => {
        throw new Error('Failed to find any recent ladybird-js build');
      });
    return `${runId}/${artifactId}`;
  }

  getDownloadURL(version) {
    const ids = version.split('/');
    return `https://nightly.link/ladybirdbrowser/ladybird/suites/${ids[0]}/artifacts/${ids[1]}`;
  }

  async extract() {
    await unzip(this.downloadPath, `${this.extractedPath}zip`);
    await untar(path.join(`${this.extractedPath}zip`, `ladybird-js-${getFilename()}.tar.gz`), this.extractedPath);
  }

  async install() {
    await this.registerAssets('lib/**');
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
