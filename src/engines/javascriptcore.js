// Copyright 2019 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the “License”);
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// <https://apache.org/licenses/LICENSE-2.0>.
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an “AS IS” BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// https://github.com/GoogleChromeLabs/jsvu/blob/master/engines/javascriptcore

'use strict';

const assert = require('assert');
const fetch = require('node-fetch');
const execa = require('execa');
const Installer = require('../installer');
const { platform, unzip } = require('../common');

async function macName() {
  const { default: macosRelease } = await import('macos-release');
  return macosRelease().name.toLowerCase();
}

async function getVersionFromBuilder(builder) {
  const url = `https://build.webkit.org/api/v2/builders/${builder}/builds?limit=1&order=-number&property=archive_revision&complete=true`;
  const body = await fetch(url).then((r) => r.json());
  return body.builds[0].properties.archive_revision[0].split('@')[0];
}

async function getMacBuilder() {
  switch (await macName()) {
    case 'ventura':
      return 706;
    case 'monterey':
      return 368;
    case 'sonoma':
      return 938;
    default:
      throw new Error(`Unknown macOS release: ${macName()}`);
  }
}

class JavaScriptCoreInstaller extends Installer {
  constructor(...args) {
    super(...args);

    this.binPath = undefined;
  }

  static shouldInstallByDefault() {
    // jsc has additional deps on windows that might not be present.
    if (platform.startsWith('win')) {
      return false;
    }
    return super.shouldInstallByDefault();
  }

  static async resolveVersion(version) {
    if (version === 'latest') {
      switch (platform) {
        case 'linux-x64':
        case 'linux-ia32':
          return fetch('https://webkitgtk.org/jsc-built-products/x86_64/release/LAST-IS')
            .then((r) => r.text())
            .then((n) => n.trim().replace('.zip', '').split('@')[0]);
        case 'win32-x64':
          return getVersionFromBuilder(27);
        case 'darwin-x64':
        case 'darwin-arm64':
          return getVersionFromBuilder(await getMacBuilder());
        default:
          throw new RangeError(`Unknown platform ${platform}`);
      }
    }
    return version;
  }

  async getDownloadURL(version) {
    switch (platform) {
      case 'darwin-x64':
      case 'darwin-arm64':
        return `https://s3-us-west-2.amazonaws.com/minified-archives.webkit.org/mac-${await macName()}-x86_64%20arm64-release/${version}@main.zip`;
      case 'linux-ia32':
        return `https://webkitgtk.org/jsc-built-products/x86_32/release/${version}@main.zip`;
      case 'linux-x64':
        return `https://webkitgtk.org/jsc-built-products/x86_64/release/${version}@main.zip`;
      case 'win32-x64':
        return `https://s3-us-west-2.amazonaws.com/archives.webkit.org/wincairo-x86_64-release/${version}@main.zip`;
      default:
        throw new RangeError(`Unknown platform ${platform}`);
    }
  }

  extract() {
    return unzip(this.downloadPath, this.extractedPath);
  }

  async install() {
    switch (platform) {
      case 'darwin-x64':
      case 'darwin-arm64': {
        await this.registerAssets('Release/JavaScriptCore.framework/**');
        const jsc = await this.registerAsset('Release/jsc');
        const source = `DYLD_FRAMEWORK_PATH="${this.installPath}/Release" DYLD_LIBRARY_PATH="${this.installPath}/Release" "${jsc}"`;
        this.binPath = await this.registerScript('javascriptcore', source);
        await this.registerScript('jsc', source);
        break;
      }
      case 'linux-ia32':
      case 'linux-x64': {
        await this.registerAssets('lib/*');
        const jsc = await this.registerAsset('bin/jsc');
        const source = `LD_LIBRARY_PATH="${this.installPath}/lib" exec "${this.installPath}/lib/ld-linux${platform === 'linux-x64' ? '-x86-64' : ''}.so.2" "${jsc}"`;
        this.binPath = await this.registerScript('javascriptcore', source);
        await this.registerScript('jsc', source);
        break;
      }
      case 'win32-x64': {
        await this.registerAssets('bin64/JavaScriptCore.resources/*');
        await this.registerAssets('bin64/*.dll');
        await this.registerAssets('bin64/*.pdb');
        const jsc = await this.registerAsset('bin64/jsc.exe');
        this.binPath = await this.registerScript('javascriptcore', `"${jsc}"`);
        await this.registerScript('jsc', `"${jsc}"`);
        break;
      }
      default:
        throw new RangeError(`Unknown platform ${platform}`);
    }
  }

  async test() {
    const program = 'print("42");';
    const output = (await execa(this.binPath, ['-e', program])).stdout;
    const pattern = /^("?)42\1$/;

    assert(
      pattern.test(output),
      `Expected string "${output}" to match pattern ${pattern}`,
    );
  }
}

JavaScriptCoreInstaller.config = {
  name: 'JavaScriptCore',
  id: 'jsc',
  externalRequirements: platform.startsWith('win') ? [
    {
      name: 'WinCairoRequirements',
      url: 'https://github.com/WebKitForWindows/WinCairoRequirements',
    },
  ] : undefined,
  supported: [
    'linux-x64',
    'win32-x64',
    'darwin-x64',
    'darwin-arm64',
  ],
};

module.exports = JavaScriptCoreInstaller;
