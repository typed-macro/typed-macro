# vite-plugin-macro

[![npm version](https://badgen.net/npm/v/vite-plugin-macro)](https://www.npmjs.com/package/vite-plugin-macro)
[![monthly downloads](https://badgen.net/npm/dm/vite-plugin-macro)](https://www.npmjs.com/package/vite-plugin-macro)
[![code coverage](https://badgen.net/codecov/c/github/viteland/vite-plugin-macro)](https://app.codecov.io/gh/viteland/vite-plugin-macro)
[![license](https://badgen.net/npm/license/vite-plugin-macro)](https://github.com/viteland/vite-plugin-macro/blob/master/LICENSE)
![types](https://badgen.net/npm/types/vite-plugin-macro)

> Brings macro capabilities to [Vite](https://github.com/vitejs/vite) based projects.

## 🚀 Getting Started

### Install

```bash
$ npm install -D vite-plugin-macro
# or
$ yarn add -D vite-plugin-macro
```

### Define a macro

```typescript
// echoMacro.ts
import { defineMacro } from 'vite-plugin-macro'

const run = <T>(block: () => T) => block()

export const echoMacro = defineMacro('echo')
  .withSignature(`(msg: string, repeat?: number): void`)
  .withHandler(({ path, args }, { template, types }) => {
    const msg = run(() => {
      if (args.length === 0) throw new Error('empty arguments is invalid')
      const firstArg = args[0]
      if (!types.isStringLiteral(firstArg))
        throw new Error('please use literal string as message')
      return firstArg.value
    })

    const repeat = run(() => {
      if (args.length < 2) return 5
      const secondArg = args[1]
      if (!types.isNumericLiteral(secondArg))
        throw new Error('please use literal number as repeat')
      return secondArg.value
    })

    path.replaceWith(
      template.statement.ast(
        `console.log('${Array.from({ length: repeat }, () => msg).join(' ')}')`
      )
    )
  })
```

### Define plugin

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vitePluginImportAssets from './plugin'
import { defineMacroPlugin } from 'vite-plugin-macro'
import { join } from 'path'
import { echoMacro } from './echoMacro'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    defineMacroPlugin({
      exports: {
        '@echo': {
          macros: [echoMacro],
        },
      },
      dtsPath: join(__dirname, 'macros.d.ts'),
    }),
  ],
})
```

### Register type declaration file

There are two ways:

- add `macros.d.ts` into your `tsconfig.json` like

  ```json5
  {
    // ...,
    include: ['macros.d.ts'],
  }
  ```

- import `macros.d.ts` to existed type declaration file like
  ```typescript
  /// <reference path="./macros.d.ts" />
  ```

Type declaration file will be created automatically every time vite dev server starts.

```shell
$ yarn dev
# or
$ yarn vite
```

### Use macros

Then you can import macros from namespace and call them as normal function.

```typescript
import { echo } from '@echo'

echo('yeah', 3)
// echo('yeah yeah yeah')
```

## 📚 Examples

- [Basic](https://github.com/viteland/vite-plugin-macro/blob/master/examples/basic/plugin/index.ts)
- [Import Glob Pattern](https://github.com/viteland/vite-plugin-macro/tree/master/examples/import-glob-pattern/plugin/index.ts)
- [Vue Ref Sugar (in JSX)](https://github.com/viteland/vite-plugin-macro/blob/master/examples/vue-ref-sugar/plugin/index.ts)
- [With External Helper](https://github.com/viteland/vite-plugin-macro/blob/master/examples/with-external-helper/plugin/index.ts)
- [Rollup](https://github.com/viteland/vite-plugin-macro/blob/master/examples/rollup/plugin/index.ts)

## 🧐 FAQ

### Q: Why named vite-plugin- instead of rollup-plugin- ?

Since vite is compatible with the most of rollup plugin APIs,
vite-plugin-macro can be used as rollup plugin of course. [[example]](https://github.com/viteland/vite-plugin-macro/blob/master/examples/rollup/plugin/index.ts)

However, vite-plugin-macro provides vite-specific helpers like `invalidateCache()`
to improve the experience of development with macros.
So the name vite-plugin- is better.

> `invalidateCache()`
>
> Suppose we have a macro whose behavior is determined by external conditions.
> When the external conditions change, we can call `invalidateCache()` to
> actively re-expand the macro, otherwise we need to restart the dev server
> if we use rollup.

### Q: Why not babel-plugin-macros or other very mature solutions?

- One word: Typescript.

  Almost all my projects are in Typescript,
  and those mature solutions have poor support for Typescript:
  whether calling macros in Typescript, or writing macros in Typescript projects.

  Only after using various tricky skills can we have a certain degree of
  development experience in Typescript with those solutions.

- Three words: Vite is awesome.

  How they solve the problem that re-expanding is required
  due to changes occurred in dependent external conditions?
