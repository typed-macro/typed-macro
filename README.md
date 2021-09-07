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

However, according to my personal experience, they are not suitable for people like me.

All my projects are in Typescript, but their support for
Typescript is usually [not so good](https://github.com/kentcdodds/babel-plugin-macros/issues/94).

In those solutions, macros cannot interact with each other,
such as [importing](https://github.com/kentcdodds/babel-plugin-macros/issues/48)
or [nesting](https://github.com/kentcdodds/babel-plugin-macros/issues/173).
And users cannot import macros [like normal functions](https://github.com/kentcdodds/babel-plugin-macros/issues/111).

Most of them are Babel plugins, so they may read something that
has been changed by other plugins but not updated yet (like [bindings](https://github.com/kentcdodds/import-all.macro/issues/7)),
and can't control its position in the transformation chain.
But the main pain point of being a Babel plugin in the modern dev flow may be that
Babel is just a transformer, knowing nothing about modules and dependencies, which means
they [cannot re-expand macros](https://github.com/kentcdodds/babel-plugin-preval/issues/19) when changes occurred in dependent external conditions.

😎 **vite-plugin-macro** is born with **Typescript**, **ES Module**, and **Vite** - **none of the above problems exist**.

## 🚀 Getting Started

```bash
$ npm install -D vite-plugin-macro
# or
$ yarn add -D vite-plugin-macro
```

<details>
<summary><b>For Macro User</b></summary>

```typescript
// vite.config.ts

import { defineConfig } from 'vite'
// a package or module that exports macro provider
import { provideEcho } from 'some-macro-provider'
// a package or module that exports macro plugin
import { pluginLoad } from 'some-macro-plugin'
// vitePluginMacro is a wrapper of macro manager
import { vitePluginMacro } from 'vite-plugin-macro'
import { join } from 'path'

const macroPlugin = vitePluginMacro({
  // the path of the auto-generated `.d.ts` file containing the types of macros
  typesPath: join(__dirname, './macros.d.ts'),
})
  .use(provideEcho()) // use a macro provider
  .use(pluginLoad()) // use a macro plugin
  .toPlugin() // into a Vite/Rollup plugin

export default defineConfig({
  plugins: [macroPlugin], // use it!
})
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
  return defineMacroProvider({
    id: 'echo',
    exports: {
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
