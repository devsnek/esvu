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


| Engine             | Binary Names¹                    | `darwin64` | `linux32` | `linux64` | `win32` | `win64` |
|--------------------|----------------------------------|------------|-----------|-----------|---------|---------|
| [Chakra][]         | `ch`, `chakra`                   | ✅         |           | ✅        | ✅      | ✅      |
| [engine262][]      | `engine262`                      | ✅         | ✅        | ✅        | ✅      | ✅      |
| [GraalJS][]        | `graaljs`                        | ✅         |           | ✅        |         | ✅      |
| [JavaScriptCore][] | `jsc`, `javascriptcore`          | ✅         | ✅        | ✅        | ✅²     | ✅²     |
| [QuickJS][]        | `quickjs`, `quickjs-run-test262` |            |           | ✅        |         |         |
| [SpiderMonkey][]   | `sm`, `spidermonkey`             | ✅         | ✅        | ✅        | ✅      | ✅      |
| [V8][]             | `v8`                             | ✅         | ✅        | ✅        | ✅      | ✅      |
| [XS][]             | `xs`                             | ✅³        | ✅        | ✅        | ✅      | ✅³     |

¹ These may be installed as symlinks, shell scripts, or batch files

² JavaScriptCore has additional runtime requirements

³ These binaries are natively 32-bit

[Chakra]: https://github.com/microsoft/chakracore
[engine262]: https://engine262.js.org
[GraalJS]: https://github.com/graalvm/graaljs
[JavaScriptCore]: https://developer.apple.com/documentation/javascriptcore
[QuickJS]: https://bellard.org/quickjs/
[SpiderMonkey]: https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey
[V8]: https://v8.dev
[XS]: https://www.moddable.com/
