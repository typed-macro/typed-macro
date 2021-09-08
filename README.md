<h1 align="center">vite-plugin-macro</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/vite-plugin-macro">
    <img alt="npm version" src="https://badgen.net/npm/v/vite-plugin-macro"/>
  </a>
</p>

<p align="center">
  <a href="https://github.com/viteland/vite-plugin-macro/actions/workflows/ci.yaml">
    <img alt="ci" src="https://github.com/viteland/vite-plugin-macro/actions/workflows/ci.yaml/badge.svg?branch=master"/>
  </a>
  <a href="https://app.codecov.io/gh/viteland/vite-plugin-macro">
    <img alt="code coverage" src="https://badgen.net/codecov/c/github/viteland/vite-plugin-macro"/>
  </a>
  <a href="https://www.npmjs.com/package/vite-plugin-macro">
    <img alt="monthly downloads" src="https://badgen.net/npm/dm/vite-plugin-macro"/>
  </a>
  <img alt="types" src="https://badgen.net/npm/types/vite-plugin-macro"/>
  <a href="https://github.com/viteland/vite-plugin-macro/blob/master/LICENSE">
    <img alt="license" src="https://badgen.net/npm/license/vite-plugin-macro"/>
  </a>
</p>

<p align="center">🤠 Brings macro capabilities to <a href="https://github.com/vitejs/vite">Vite</a> based projects.</p>
<p align="center">
  <a href="https://stackblitz.com/edit/macro-example-vue-ref?file=src/App.tsx">Simple Vue Ref Sugar Live Demo</a>
</p>
<p align="center">
  <a href="#-documentation">Documentation</a>
</p>
<p align="center">
  <a href="./examples">Examples</a>
</p>

## 🧐 Why vite-plugin-macro

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
and can't control its position in the transformation chain.
But the main pain point of being a Babel plugin in the modern dev flow may be that
Babel is just a transformer, knowing nothing about modules and dependencies, which means
they [cannot re-expand macros](https://github.com/kentcdodds/babel-plugin-preval/issues/19) when changes occurred in dependent external conditions.

😎 **vite-plugin-macro** stands on the shoulders of **Typescript**, **ES Module**, and **Vite** - **none of the above problems exist anymore**.

## 🚀 Getting Started

```bash
$ npm install -D vite-plugin-macro
# or
$ yarn add -D vite-plugin-macro
```

<details>
<summary><b>For Macro User</b></summary>

**Register Plugin in Vite Config**

```typescript
// vite.config.ts

import { defineConfig } from 'vite'
// a package or module that exports macro provider
import { provideEcho } from 'some-macro-provider'
// a package or module that exports macro plugin
import { pluginLoad } from 'some-macro-plugin'
// vitePluginMacro is a wrapper of macro manager with some default options
import { vitePluginMacro } from 'vite-plugin-macro'
import { join } from 'path'

const macroPlugin = vitePluginMacro({
  // the generated `.d.ts` file will include the types of macros
  typesPath: join(__dirname, './macros.d.ts'),
})
  .use(provideEcho()) // use a macro provider
  .use(pluginLoad()) // use a macro plugin
  .toPlugin() // into a Vite/Rollup plugin

export default defineConfig({
  plugins: [macroPlugin], // use it!
})
```

**Add `d.ts` to Your Project**

You can either add the generated `d.ts` file to your `tsconfig.json` like

```json
{
  "include": ["path/to/the/d.ts/file"]
}
```

or import it in your existed `d.ts` in project like

```typescript
/// <reference path="path/to/the/d.ts/file" />
```

**Use Macros!**

```typescript
// any .ts/.tsx/.js/.jsx file

// import macros like normal functions,
import { echo } from '@macro'
// or give an alias?
import { echo as _echo } from '@macro'
// or even import namespace?
import * as macros from '@macro'
// default import is the same as namespace import!
import _macros from '@macro'

// use macros like normal functions
echo()
_echo()
macros.echo()
_macros.echo()

// macros can be shadowed
{
  const echo = () => console.log('hello')
  echo() // it's not a macro call
}

// The only thing you can't do is changing the imported macros,
// like assign the imported macro to another variable
// and use it by the variable
const localEcho = macros.echo
localEcho() // please don't do it.

// Suppose the macro has a function type `(): void`
console.log(echo()) // `Void function return value is used` is reported because we have types!

// or even import types if we have!
import type { XXX } from '@macros'
let a: XXX
```

For more information, see the [documentation](#-documentation).

</details>

<details>
<summary><b>For Macro Author</b></summary>

**Define a Macro**

```typescript
import { defineMacro } from 'vite-plugin-macro'

const run = <T>(block: () => T) => block() // just a helper...

const echoMacro = defineMacro('echo') // macro builder
  // wow you can give macro a function signature!
  .withSignature('(msg: string, repeat?: number): void')
  // give macro a handler
  .withHandler(({ path, args }, { template, types }) => {
    const msg = run(() => {
      // you can throw errors directly; the error message with the row number and col number
      // of the macro call currently being expanded will be in the terminal.
      // so you don't have to worry about telling users where the wrong code is.
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
      template.statement.ast`console.log("${Array.from(
        { length: repeat },
        () => msg
      ).join(' ')}")`
    )
  })
```

**Define a MacroProvider**

```typescript
// define macro provider

import { defineMacroProvider } from 'vite-plugin-macro'

export function provideEcho() {
  // a macro provider provides macros/modules with simple hooks,
  // which must be used with a macro manager.
  return defineMacroProvider({
    id: 'echo',
    exports: {
      // so users can import macros from '@echo'
      '@echo': {
        macros: [echoMacro],
      },
    },
  })
}
```

**Or Define a MacroPlugin**

```typescript
// define macro provider

import { defineMacroPlugin } from 'vite-plugin-macro'

export function echoPlugin() {
  // a macro plugin is actually a vite plugin;
  // you can use any Vite/Rollup hook like a regular vite plugin.
  // but you must specify more options than defining a provider
  // because users may use it independently.
  return defineMacroPlugin({
    name: 'macro-echo',
    typesPath: join(__dirname, 'macros.d.ts'),
    exports: {
      '@echo': {
        macros: [echoMacro],
      },
    },
  })
}
```

For more information, see the [documentation](#-documentation).

</details>

## 📄 Documentation

💡 vite-plugin-macro provides plenty of explanatory comments for
each function parameter and each type field in its type declaration file.
So you can obtain more detailed descriptions in your IDE and `vite-plugin-macro/dist/index.d.ts`.

### 🔧 Define Your First Macro

It's pretty easy to define a macro!

vite-plugin-macro provides a function called `defineMacro()`, which creates a macro builder for you.

```typescript
import { defineMacro } from 'vite-plugin-macro'

const helloMacro = defineMacro(`hello`)
  .withCustomType(`export type Message = string`)
  .withSignature(`(): void`)
  .withSignature(`(msg: Message): void`, `output hello message`)
  .withHandler((ctx, babel, helper) => {
    const { path, args } = ctx
    const { template, types } = babel

    let msg: string
    if (args.length === 0) msg = 'Rollup'
    else {
      const firstArg = args[0]
      if (!types.isStringLiteral(firstArg))
        throw new Error('please use literal string as message')
      msg = firstArg.value
    }

    path.replaceWith(template.statement.ast(`console.log("Hello, ${msg}")`))
  })
```

_The above example is **JUST** to show how to define multiple signatures.
The above scenario is more suitable for using optional parameters
rather than overloading. see [Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html#use-optional-parameters)._

As the above example shows, you should give a name, at least one signature,
maybe with a comment, and a handler function to a macro.
The custom type is optional.

Once the plugin starts (in Vite/Rollup),
the name, signatures, comments, and custom types will be combined and rendered
into a type declaration file, aka a `.d.ts` file.
So it's essential to write them correctly to provide a friendly develop experience in Typescript.

Note that the handler receives three arguments: `ctx`, `babel`, and `helper`.

- `ctx` - the transformation context, including the [node path](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#paths) of
  the call expression currently being processed, traversal states, argument nodes, and so on.
- `babel` - a collection of Babel tools, containing
  [@babel/types](https://babeljs.io/docs/en/babel-types),
  [@babel/traverse](https://babeljs.io/docs/en/babel-traverse),
  [@babel/parser](https://babeljs.io/docs/en/babel-parser),
  [@babel/template](https://babeljs.io/docs/en/babel-template).
- `helper` - some wrapper functions on Babel tools make writing macro handlers easier.

vite-plugin-macro regards macros as functions;
when processing a source file, it will traverse all import statements
to find the imported macros, then traverse all function calls,
and call macro handlers for those macros.

Though sometimes these lexical macros are cumbersome to write,
please don't forget to remove or replace the call expressions like `ctx.path.replaceWith()`
or `ctx.path.remove()`, otherwise the plugin will process this call expression
again and again because there is always a macro call remaining in the source
until it reached the maximum recursion.

### 📦 Organize Your Macros Together

TBD

### 🎨 Use Your Macros

TBD
