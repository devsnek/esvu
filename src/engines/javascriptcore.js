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

  static async resolveVersion(version) {
    if (version === 'latest') {
      switch (platform) {
        case 'linux32':
        case 'linux64': {
          const body = await fetch(`https://webkitgtk.org/jsc-built-products/x86_${platform === 'linux32' ? '32' : '64'}/release/?C=M;O=D`)
            .then((r) => r.text());
          // Check for the most recent *.sha256sum file rather than the
          // most recent *.zip file to avoid the race condition where the
          // ZIP file has not fully been uploaded yet. The *.sha256sum
          // files are written last, so once one is available the
          // corresponding ZIP file is guaranteed to be available.
          // https://mths.be/bww
          const match = /<a href="(\d+)\.sha256sum">/.exec(body);
          return match[1];
        }
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

  extract(from, to) {
    return unzip(from, to);
  }

  async install() {
    switch (platform) {
      case 'darwin64': {
        await this.registerAssets('Release/JavaScriptCore.framework/**');
        const jsc = await this.registerAsset('Release/jsc');
        const source = `DYLD_FRAMEWORK_PATH="${this.finalLocation}/Release" DYLD_LIBRARY_PATH="${this.finalLocation}/Release" "${jsc}"`;
        this.binPath = await this.registerScript('javascriptcore', source);
        await this.registerScript('jsc', source);
        break;
      }
      case 'linux32':
      case 'linux64': {
        await this.registerAssets('lib/*');
        const jsc = await this.registerAsset('bin/jsc');
        const source = `LD_LIBRARY_PATH="${this.finalLocation}/lib" exec "${this.finalLocation}/lib/ld-linux${platform === 'linux64' ? '-x86-64' : ''}.so.2" "${jsc}"`;
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
};

module.exports = JavaScriptCoreInstaller;
