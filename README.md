# vite-plugin-macro

[![npm version](https://badgen.net/npm/v/vite-plugin-macro)](https://www.npmjs.com/package/vite-plugin-macro)
[![monthly downloads](https://badgen.net/npm/dm/vite-plugin-macro)](https://www.npmjs.com/package/vite-plugin-macro)
[![code coverage](https://badgen.net/codecov/c/github/viteland/vite-plugin-macro)](https://app.codecov.io/gh/viteland/vite-plugin-macro)
[![license](https://badgen.net/npm/license/vite-plugin-macro)](https://github.com/viteland/vite-plugin-macro/blob/master/LICENSE)
![types](https://badgen.net/npm/types/vite-plugin-macro)

🤠 Brings macro capabilities to [Vite](https://github.com/vitejs/vite) based projects.

## 🚀 Getting Started

```bash
$ npm install -D vite-plugin-macro
# or
$ yarn add -D vite-plugin-macro
```

## 📚 Documentation

- [Basic Concepts](/doc/basic-concepts.md)
- [For Macro Author](/doc/for-author.md)
- [For Macro User](/doc/for-user.md)

## 🧪 Examples

- [Basic](/examples/basic)
- [Import Glob Pattern](/examples/import-glob-pattern)
- [Use Provider](/examples/provider)
- [Vue Ref Sugar (in JSX)](/examples/vue-ref-sugar)
- [With External Helper](/examples/with-external-helper)
- [Rollup](/examples/rollup)

## 🧐 FAQ

### Q. Why vite-plugin- rather than rollup-plugin- ?

Since vite is compatible with the most of rollup plugin APIs, vite-plugin-macro can be used as rollup plugin, of
course. [[example]](https://github.com/viteland/vite-plugin-macro/blob/master/examples/rollup/plugin/index.ts)

However, vite-plugin-macro provides vite-specific helpers like `invalidateCache()` to improve the experience of
development with macros.

> `invalidateCache()`
>
> Suppose we have a macro whose behavior is determined by external conditions.
> When the external conditions change, we can call `invalidateCache()` to
> actively re-expand the macro, otherwise we need to restart the dev server
> if we use rollup.

### Q. Why not babel-plugin-macros or other very mature solutions?

- One word: Typescript.

  Almost all my projects are in Typescript, and those mature solutions have poor support for Typescript: whether calling
  macros in Typescript, or writing macros in Typescript projects.

  Only after using various tricky skills can we have a certain degree of development experience in Typescript with those
  solutions.

- Three words: Vite is awesome.

  How can they solve the problem that re-expanding is required when changes occurred in dependent external conditions?
