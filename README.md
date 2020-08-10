# esvu

esvu is your one-stop shop for all implementations of ECMAScript.

## Installation

```
$ npm i -g esvu
```

Add `~/.esvu/bin` to your `PATH`.

## Usage

The first time you run `esvu`, it will ask you which engines you wish to
install. After the first run, running `esvu` will update the engines you
selected.

- `$ esvu`
  Update all installed engines, or select engines to install
- `$ esvu install <engine>`
  Install the engine `<engine>`
- `$ esvu uninstall <engine>`
  Uninstall `<engine>`
- `$ esvu update <engine>`
  Update `<engine>`. Like `install` but the engine must have been previously
  installed.

If you're using [eshost-cli][], you can run `eshost --configure-esvu` after
installing engines to make eshost automatically find the installed engines.

| Engine             | Binary Names                     | `darwin64` | `linux32` | `linux64` | `win32` | `win64` |
|--------------------|----------------------------------|------------|-----------|-----------|---------|---------|
| [Chakra][]         | `ch`, `chakra`                   | ✅         |           | ✅        | ✅      | ✅      |
| [engine262][]      | `engine262`                      | ✅         | ✅        | ✅        | ✅      | ✅      |
| [GraalJS][]        | `graaljs`                        | ✅         |           | ✅        |         | ✅      |
| [Hermes][]         | `hermes`                         | ✅         |           | ✅        |         | ✅      |
| [JavaScriptCore][] | `jsc`, `javascriptcore`          | ✅         | ✅        | ✅        | ✅      | ✅      |
| [QuickJS][]        | `quickjs`, `quickjs-run-test262` |            |           | ✅        |         |         |
| [SpiderMonkey][]   | `sm`, `spidermonkey`             | ✅         | ✅        | ✅        | ✅      | ✅      |
| [V8][]             | `v8`                             | ✅         | ✅        | ✅        | ✅      | ✅      |
| [XS][]             | `xs`                             | ✅         | ✅        | ✅        | ✅      | ✅      |

Some binaries may be exposed as batch/shell scripts to properly handling shared library loading. Some binaries on
64-bit systems may be natively 32-bit.

[eshost-cli]: https://github.com/bterlson/eshost-cli
[Chakra]: https://github.com/microsoft/chakracore
[engine262]: https://engine262.js.org
[GraalJS]: https://github.com/graalvm/graaljs
[Hermes]: https://hermesengine.dev
[JavaScriptCore]: https://developer.apple.com/documentation/javascriptcore
[QuickJS]: https://bellard.org/quickjs/
[SpiderMonkey]: https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey
[V8]: https://v8.dev
[XS]: https://www.moddable.com/
