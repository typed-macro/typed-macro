<p align="center">
  <img alt="logo" src="https://github.com/typed-macro/art/raw/master/SVG/logo-filled-full.svg" width="360">
</p>

<p align="center">
  <a href="https://github.com/typed-macro/typed-macro/releases">
    <img alt="version" src="https://img.shields.io/gitlab/v/release/typed-macro/typed-macro?include_prereleases&sort=semver">
  </a>
</p>

<p align="center">
  <a href="https://app.codecov.io/gh/typed-macro/typed-macro">
    <img alt="code coverage" src="https://img.shields.io/codecov/c/gh/typed-macro/typed-macro"/>
  </a>
  <a href="https://github.com/typed-macro/typed-macro/actions/workflows/ci.yaml">
    <img alt="ci" src="https://github.com/typed-macro/typed-macro/actions/workflows/ci.yaml/badge.svg?branch=master">
  </a>
  <img alt="wrappers" src="https://img.shields.io/badge/platform-Vite-green">
  <a href="https://github.com/typed-macro/typed-macro/blob/master/LICENSE">
    <img alt="license" src="https://img.shields.io/github/license/typed-macro/typed-macro"/>
  </a>
</p>

<p align="center">
  🤠 Provide macros to your projects. 
</p>

<p align="center">
  <a href="DOCUMENTATION.md">Documentation</a>
</p>

## 🧐 Why @typed-macro

There are already many solutions that provide macro capabilities
for Javascript and Typescript projects.
Some of them are very mature, such as [babel-plugin-macros](https://github.com/kentcdodds/babel-plugin-macros)
(it's awesome, and maybe you will be interested in it).

However, according to my personal experience, they are not suitable for people like me - all my projects are in Typescript, but their support for
Typescript is usually [not so good](https://github.com/kentcdodds/babel-plugin-macros/issues/94).

Also, in those solutions, macros cannot interact with each other,
such as [importing](https://github.com/kentcdodds/babel-plugin-macros/issues/48)
or [nesting](https://github.com/kentcdodds/babel-plugin-macros/issues/173).
And users cannot import macros [like normal functions](https://github.com/kentcdodds/babel-plugin-macros/issues/111).

Most of them are Babel plugins, so they may read something that
has been changed by other plugins but not updated yet (like [bindings](https://github.com/kentcdodds/import-all.macro/issues/7)),
and can't control [its position](https://jamie.build/babel-plugin-ordering.html) in the transformation chain.
But in the modern dev flow, the main pain point of being a Babel plugin may be that
Babel is just a transformer, knowing nothing about modules and dependency graph, which means
they [cannot re-expand macros](https://github.com/kentcdodds/babel-plugin-preval/issues/19) when changes occurs in dependent external conditions.

😎 **@typed-macro** stands on the shoulders of **Typescript** and **ES Module** - **none of the above problems exist anymore**.

## 📈 Road Map

| Package                 | Status                                         | Documentation                              |
| ----------------------- | ---------------------------------------------- | ------------------------------------------ |
| @typed-macro/core       | [![core][core-icon]][core-url]                 | [English](packages/core/README.md)         |
| @typed-macro/runtime    | [![runtime][runtime-icon]][runtime-url]        | -                                          |
| @typed-macro/test-utils | [![core][test-utils-icon]][test-utils-url]     | [English](packages/test-utils/README.md)   |
| vite-plugin-macro       | [![core][wrapper-vite-icon]][wrapper-vite-url] | [English](packages/wrapper-vite/README.md) |
| \*rollup                | 🚧                                             | 🚧                                         |
| \*webpack               | 🚧                                             | 🚧                                         |

[core-icon]: https://img.shields.io/npm/v/@typed-macro/core
[core-url]: https://www.npmjs.com/package/@typed-macro/core
[runtime-icon]: https://img.shields.io/npm/v/@typed-macro/runtime
[runtime-url]: https://www.npmjs.com/package/@typed-macro/runtime
[test-utils-icon]: https://img.shields.io/npm/v/@typed-macro/test-utils
[test-utils-url]: https://www.npmjs.com/package/@typed-macro/test-utils
[wrapper-vite-icon]: https://img.shields.io/npm/v/vite-plugin-macro
[wrapper-vite-url]: https://www.npmjs.com/package/vite-plugin-macro
