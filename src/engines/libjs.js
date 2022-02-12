'use strict';

const assert = require('assert');
const execa = require('execa');
const fetch = require('node-fetch');
const path = require('path');
const Installer = require('../installer');
const { platform, unzip, untar } = require('../common');

function checkPlatform() {
  switch (platform) {
    case 'linux-x64':
      return;
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
    checkPlatform();
    if (version !== 'latest') {
      throw new Error('LibJS only provides binary builds for \'latest\'');
    }

    const artifactId = await fetch('https://api.github.com/repos/serenityos/serenity/actions/artifacts')
      .then((x) => x.json())
      .then((x) => x.artifacts.filter((a) => a.name === 'serenity-js'))
      .then((x) => x[0].id)
      .catch(() => {
        throw new Error('Failed to find any releases for serenity-js on SerenityOS/serenity');
      });
    const runId = await fetch('https://api.github.com/repos/serenityos/serenity/actions/runs?event=push&branch=master&status=success')
      .then((x) => x.json())
      .then((x) => x.workflow_runs.filter((a) => a.name === 'Run test262 with LibJS and push results to the website repo'))
      .then((x) => x.sort((a, b) => a.check_suite_id > b.check_suite_id))
      .then((x) => x[0].check_suite_id)
      .catch(() => {
        throw new Error('Failed to find any recent serenity-js build run');
      });
    return `${runId}/${artifactId}`;
  }

  getDownloadURL(version) {
    const ids = version.split('/');
    return `https://nightly.link/serenityos/serenity/suites/${ids[0]}/artifacts/${ids[1]}`;
  }

  async extract() {
    await unzip(this.downloadPath, `${this.extractedPath}zip`);
    await untar(path.join(`${this.extractedPath}zip`, 'serenity-js.tar.gz'), this.extractedPath);
  }

  async install() {
    await this.registerAssets('serenity-js/lib/*.so*');
    const js = await this.registerAsset('serenity-js/bin/js');
    this.binPath = await this.registerScript('serenity-js', `"${js}"`);
  }

  async test() {
    const program = 'console.log("42")';
    const output = '42';

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
  ],
};

module.exports = LibJSInstaller;
