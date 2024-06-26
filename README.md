# esvu

esvu is your one-stop shop for all implementations of ECMAScript.

## Installation

```
$ npm i -g esvu
```

esvu will attempt to respect `XDG_DATA_HOME`, and will fall back to the
home directory. You will need to add esvu's bin to your `PATH`, for
example `$XDG_DATA_HOME/.esvu/bin` or `/home/snek/.esvu/bin`.

You may override the path entirely by setting the `ESVU_PATH` environment
variable.

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

| Engine             | Binary Names                     | `darwin-x64` | `darwin-arm64` | `linux-ia32` | `linux-x64` | `linux-arm64` | `win32-ia32` | `win32-x64` |
| ------------------ | -------------------------------- | ------------ | -------------- | ------------ | ----------- | ------------- | ------------ | ----------- |
| [Boa][]            | `boa`,                           | ✅           |                |              | ✅         |               |              | ✅          |
| [engine262][]      | `engine262`                      | ✅           | ✅             | ✅           | ✅          | ✅            | ✅           | ✅       |
| [GraalJS][]        | `graaljs`                        | ✅           | ✅             |              | ✅          | ✅            |              | ✅        |
| [Hermes][]         | `hermes`                         | ✅           | ✅             |              |             |               |              | ✅          |
| [LibJS][]          | `ladybird-js`                    | ✅           | ✅             |              | ✅          |               |              |             |
| [JavaScriptCore][] | `jsc`, `javascriptcore`          | ✅           | ✅             |              | ✅          |               |              | ✅          |
| [QuickJS][]        | `quickjs`, `quickjs-run-test262` | ✅           |                | ✅           | ✅          |               | ✅           | ✅          |
| [SpiderMonkey][]   | `sm`, `spidermonkey`             | ✅           | ✅             | ✅           | ✅          |               | ✅           | ✅          |
| [V8][]             | `v8`                             | ✅           | ✅             | ✅           | ✅          |               | ✅           | ✅          |
| [XS][]             | `xs`                             | ✅           | ✅             |              | ✅          | ✅            |              | ✅          |

Some binaries may be exposed as batch/shell scripts to properly handling shared library loading. Some binaries on
64-bit systems may be natively 32-bit.

[Boa]: https://boajs.dev/
[eshost-cli]: https://github.com/bterlson/eshost-cli
[engine262]: https://engine262.js.org
[GraalJS]: https://github.com/graalvm/graaljs
[Hermes]: https://hermesengine.dev
[LibJS]: https://github.com/ladybirdbrowser/ladybird
[JavaScriptCore]: https://developer.apple.com/documentation/javascriptcore
[QuickJS]: https://bellard.org/quickjs/
[SpiderMonkey]: https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey
[V8]: https://v8.dev
[XS]: https://www.moddable.com/
