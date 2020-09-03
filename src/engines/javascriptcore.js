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
        case 'linux64':
          return fetch('https://webkitgtk.org/jsc-built-products/x86_64/release/LAST-IS')
            .then((r) => r.text())
            .then((n) => n.trim().replace('.zip', ''));
        case 'win32': {
          const body = await fetch('https://build.webkit.org/builders/Apple%20Win%2010%20Release%20(Build)?numbuilds=25')
            .then((r) => r.text());
          const match = /<td><span[^>]+><a href="[^"]+">(\d+)<\/a><\/span><\/td>\s*<td class="success">success<\/td>/.exec(body);
          return match[1];
        }
        case 'win64': {
          const body = await fetch('https://build.webkit.org/builders/WinCairo%2064-bit%20WKL%20Release%20%28Build%29?numbuilds=25')
            .then((r) => r.text());
          const match = /<td><span[^>]+><a href="[^"]+">(\d+)<\/a><\/span><\/td>\s*<td class="success">success<\/td>/.exec(body);
          return match[1];
        }
        case 'darwin64': {
          const body = await fetch('https://build.webkit.org/builders/Apple-Catalina-Release-Build?numbuilds=25')
            .then((r) => r.text());
          const match = /<td><span[^>]+><a href="[^"]+">(\d+)<\/a><\/span><\/td>\s*<td class="success">success<\/td>/.exec(body);
          return match[1];
        }
        default:
          throw new RangeError(`Unknown platform ${platform}`);
      }
    }
    return version;
  }

  getDownloadURL(version) {
    switch (platform) {
      case 'darwin64':
        return `https://s3-us-west-2.amazonaws.com/minified-archives.webkit.org/mac-catalina-x86_64-release/${version}.zip`;
      case 'linux32':
        return `https://webkitgtk.org/jsc-built-products/x86_32/release/${version}.zip`;
      case 'linux64':
        return `https://webkitgtk.org/jsc-built-products/x86_64/release/${version}.zip`;
      case 'win32':
        return `https://s3-us-west-2.amazonaws.com/archives.webkit.org/win-i386-release/${version}.zip`;
      case 'win64':
        return `https://s3-us-west-2.amazonaws.com/archives.webkit.org/wincairo-x86_64-release/${version}.zip`;
      default:
        throw new RangeError(`Unknown platform ${platform}`);
    }
  }

  extract() {
    return unzip(this.downloadPath, this.extractedPath);
  }

  async install() {
    switch (platform) {
      case 'darwin64': {
        await this.registerAssets('Release/JavaScriptCore.framework/**');
        const jsc = await this.registerAsset('Release/jsc');
        const source = `DYLD_FRAMEWORK_PATH="${this.installPath}/Release" DYLD_LIBRARY_PATH="${this.installPath}/Release" "${jsc}"`;
        this.binPath = await this.registerScript('javascriptcore', source);
        await this.registerScript('jsc', source);
        break;
      }
      case 'linux32':
      case 'linux64': {
        await this.registerAssets('lib/*');
        const jsc = await this.registerAsset('bin/jsc');
        const source = `LD_LIBRARY_PATH="${this.installPath}/lib" exec "${this.installPath}/lib/ld-linux${platform === 'linux64' ? '-x86-64' : ''}.so.2" "${jsc}"`;
        this.binPath = await this.registerScript('javascriptcore', source);
        await this.registerScript('jsc', source);
        break;
      }
      case 'win32':
      case 'win64': {
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
    const output = '42';

    assert.strictEqual(
      (await execa(this.binPath, ['-e', program])).stdout,
      output,
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
    'linux64',
    'win32', 'win64',
    'darwin64',
  ],
};

module.exports = JavaScriptCoreInstaller;
