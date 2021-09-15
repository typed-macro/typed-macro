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
and can't control [its position](https://jamie.build/babel-plugin-ordering.html) in the transformation chain.
But in the modern dev flow, the main pain point of being a Babel plugin may be that
Babel is just a transformer, knowing nothing about modules and dependency graph, which means
they [cannot re-expand macros](https://github.com/kentcdodds/babel-plugin-preval/issues/19) when changes occurs in dependent external conditions.

😎 **vite-plugin-macro** stands on the shoulders of **Typescript**, **ES Module**, and **Vite** - **none of the above problems exist anymore**.

## 🚀 Getting Started

```bash
$ npm install -D vite-plugin-macro
# or
$ yarn add -D vite-plugin-macro
```

<details>
<summary><b>☕ For Macro Users</b></summary>

#### ➤ Register Plugin in Vite Config

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

#### ➤ Add `d.ts` to Your Project

You can either add the generated `d.ts` file to your `tsconfig.json` like

```json
{
  "include": ["path/to/the/d.ts/file"]
}
```

or import it in your existed `d.ts` in project using [triple-slash directives](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html) like

```typescript
/// <reference path="path/to/the/d.ts/file" />
```

#### ➤ Use Macros!

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
<summary><b>⌨️ For Macro Authors</b></summary>

#### ➤ Define a Macro

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

#### ➤ Define a MacroProvider

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

#### ➤ Or Define a MacroPlugin

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

So detailed parameters or types won't be repeated here;
you can obtain them in `vite-plugin-macro/dist/index.d.ts` and tips provided by your IDE.

The following will introduce this plugin's basic concepts and internal mechanism.

### 🔧 Define Your First Macro

It's pretty easy to define a macro! As long as you know the
[basic principles of AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) and [basic operation APIs of Babel](https://github.com/jamiebuilds/babel-handbook).

vite-plugin-macro exports a function called `defineMacro()`, which creates a macro builder for you.

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
rather than overloading. See [Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html#use-optional-parameters)._

As the above example shows, you should give a name, at least one signature,
maybe with a comment, and a handler function to a macro.
The custom type is optional.

Once the plugin starts (in Vite/Rollup),
the names, signatures, comments, and custom types of macros will be rendered and written
into a type declaration file, aka a `.d.ts` file.

vite-plugin-macro wants macros to be transparent to users;
that is, users can use macros like normal functions.
So it's essential to write types/comments correctly to provide a friendly development experience.

Note that the handler receives three arguments: `ctx`, `babel`, and `helper`.

- `ctx` - the transformation context, including the [node path](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#paths) of
  the call expression currently being processed, traversal states, argument nodes, and so on.
- `babel` - a collection of Babel tools, containing
  [@babel/types](https://babeljs.io/docs/en/babel-types),
  [@babel/traverse](https://babeljs.io/docs/en/babel-traverse),
  [@babel/parser](https://babeljs.io/docs/en/babel-parser),
  [@babel/template](https://babeljs.io/docs/en/babel-template).
- `helper` - some functions that wrap Babel tools to make writing macro handlers easier.

When processing a source file,
vite-plugin-macro will traverse all import statements
to find the imported macros, then traverse all function calls,
and call corresponding handlers for those macros **one by one**.

_One by one: in order for macros to handle nested relationships correctly,
and reduce the conflict on modifying the AST,
it is necessary to reject asynchronous macro processing.
**Therefore, sorry, you can't use asynchronous macro handlers.**_

If the handler is a normal function like the above example shows,
the nested macros inside the current call expression will be expanded
automatically before calling the handler.

If the handler is a generator function, you can:

- yield node paths of import statements to collect macros from them,
  _note that macros must be collected before used, or you should wait for the next traversal
  because the runtime collects imported macros automatically before every traversal_
- yield node paths to positively expand macros inside them
- yield undefined to do nothing 😂

e.g.

```typescript
const helloMacro = defineMacro(`hello`)
  .withSignature(`(msg?: string): void`, `output hello message`)
  .withHandler(function* (
    { path },
    { template },
    { prependImports, appendToBody }
  ) {
    // do some thing...

    // expand macros inside the current call expression
    yield path.get('arguments')

    // do some thing...

    // actively collect the imported macro so it can be used immediately,
    // or you should wait for the next traversal
    yield prependImports({
      moduleName: '@other-macros',
      exportName: 'macro',
      localName: '__macro',
    })

    // expand the isnerted macros
    yield appendToBody(template.statement.ast(`__macro()`))

    // do some thing..
  })
```

You can find an example of using generator handler [here](fixtures/vite-build/issue-23/input/plugin.ts).

The three steps, _traversing import statements_, _traversing call expressions_, and _calling corresponding
handlers for macros during traversing call expressions_, will be repeated many times until all macros are expanded,
or the maximum recursion is reached (it's a value that can be configured by users,
and you'll see it soon).

The pseudo-code for the above process is:

```text
for each loop
  for each import_statement
    if imports macro(s)
      collect it/them
  for each call_expression
    if is a macro call
      call the handler to expand it
  if no macro found in this loop
    break
```

Though sometimes writing these lexical macros themselves is cumbersome enough,
please always keep the following in mind:

- don't forget to remove or replace the macro call expressions,
  otherwise the plugin will process this call expression
  again and again because there is always a macro call remaining in the source.
- If you replace the current call expression with another call expression,
  the next traversed node will be this new call expression.
  Therefore, if you replace current macro call expression with another macro call,
  please make sure this replacement is not recursive.

### 📦 Organize Your Macros

It is not enough to have defined macros only. Macros should be organized,
at least, into some `modules` so that users can import them.

#### ➤ Exportable (for macro authors)

In vite-plugin-macro, the most basic organizational unit is `Exportable`.

An `Exportable` contains either **Javascript code** and corresponding types,
or macros and additional types.

```typescript
type Exportable =
  | { macros: Macro[]; customTypes?: string }
  | { code: string; customTypes?: string }
```

_Macro authors often prefer to use external helpers in the expanded code
in order to reduce the final size.
So `Exportable` is designed to be able to contain Javascript code (external helpers)._

#### ➤ NamespacedExportable (for macro authors)

`NamespacedExportable` is a collection of `Exportable`s.

```typescript
type NamespacedExportable = { [namespace: string]: Exportable }
```

#### ➤ Runtime (internal)

`NamespacedExportable` also needs a container to manage itself -
the container is called `Runtime`, an internal concept,
but vite-plugin-macro exports some public types/functions derived from it.

The Runtime manages the rendering of types,
the loading of virtual modules, the transformation of source files, etc.

In general, a Runtime can be seen as a combination of code transformer and type renderer.

The code transformer can parse source files into ASTs, handle some traversal processes,
and call macro handlers.

The type renderer can render a `NamespacedExportable` into `d.ts` file.

For example, `{ '@macros': { macros: [helloMacro], customTypes: 'export type X = number' } }`
can be rendered into

```typescript
declare module '@macros' {
  export type X = number
  export type Message = string
  export function hello(): void
  /* output hello message */
  export function hello(msg: Message): void
}
```

Runtime options are roughly composed of the transformer's, the filter's, and the type renderer's,
and **these options are available in functions/types that wrap the Runtime**(i.e., MacroPlugin, MacroManager).
For example, there is a `parserPlugins` that can configure the Babel parser plugins used
in parsing source files, and `maxRecursions` sets the maximum number of traversals;
`typesPath` can specify the file path to which the Runtime writes the generated types;
`exclude` and `include` determine which files can be expanded by the macro
and which files are always skipped.

#### ➤ MacroPlugin (for macro authors)

A MacroPlugin is actually a Vite plugin that wraps Runtime.

You can use `defineMacroPlugin()` to define a MacroPlugin. It requires a plugin name,
a `NamespacedExportable` and some options for Runtime. Vite plugin hooks are also supported!

```typescript
import { defineMacroPlugin } from 'vite-plugin-macro'
defineMacroPlugin({
  name: 'macro-plugin-hello',
  // namespaced exportable
  exports: {
    '@macros': {
      macros: [helloMacro],
    },
  },
  // define Vite hooks here!
  hooks: {
    load() {
      console.log('hello from a macro plugin')
    },
  },
  // below are some options for Runtime
  typesPath: join(__dirname, 'macros.d.ts'),
  maxRecursions: 10,
})
```

The MacroPlugin is very convenient to use because it's an independent Vite plugin; however,
once multiple MacroPlugins are used, there will be some problems like that
macros in one MacroPlugin cannot interact with those in another MacroPlugins,
the generated small type declaration files are everywhere, same options may be
repeated many times when using these plugins, and so on.

That's why we have MacroManager.

#### ➤ MacroManager (for macro users)

MacroManager is a special MacroPlugin created by `createMacroManager()`.

It has no plugin hooks, no `NamespacedExportable`,
but can `use` other MacroPlugins and MacroProviders so that all macros can share one Runtime.

```typescript
// vite.config.ts
import { createMacroManager } from 'vite-plugin-macro'

const manager = createMacroManager({
  name: 'macro-manager',
  // all types from all macro plugins/providers will be rendered into this file
  typesPath: join(__dirname, './macros.d.ts'),
})

export default defineConfig({
  plugins: [manager.use(someMacroPlugin).use(someMacroProvider).toPlugin()],
})
```

But wait, what is a MacroProvider?

#### ➤ MacroProvider (for macro authors)

Since we have MacroManager to manage all macros and shared Runtime options,
it's unnecessary to always organize macros as plugins if we don't need to use many Vite plugin hooks.

MacroProvider is a lighter choice, only can be used in MacroManager.

It can be roughly regarded as a plain object having `NamespacedExportable` and some Runtime options,
with simple hooks like `onViteStart()` and `onRollupStart()`; these hooks can cover most usage scenarios.

```typescript
import { defineMacroProvider } from 'vite-plugin-macro'

defineMacroProvider({
  id: 'echo',
  exports: {
    '@macros': {
      macros: [helloMacro],
    },
  },
})
```

#### ➤ vitePluginMacro (for macro users)

`vitePluginMacro()` provides default values for required options of `createMacroManager()`
so that macro users can quickly create a MacroManager.

```typescript
// vite.config.ts
import { vitePluginMacro } from 'vite-plugin-macro'

export default defineConfig({
  plugins: [vitePluginMacro().use(someProvider).use(somePlugin).toPlugin()],
})
```

### 🧪 Test Your Macros

vite-plugin-macro exports some test utils for macro authors.

#### ➤ TestTransformer

TestTransformer is similar with the real Transformer inside the Runtime, but has a
more friendly API.

```typescript
type NamespacedMacros = {
  [namespace: string]: Macro[]
}
type TestTransformer = {
  (ctx: TestTransformerContext, macros: NamespacedMacros): string
  (code: string, macros: NamespacedMacros): string
}
```

Here is an example about using TestTransformer with Jest:

```typescript
// Suppose you have defined a macro called `macroLoad`
const transform = createTestTransformer()
const macros = { '@load': [macroLoad] }
expect(transform(`...some code`, macros)).toMatchSnapshot()
expect(transform({ code: `...some code`, ssr: true }, macros)).toMatchSnapshot()
```

#### ➤ TestTypeRenderer

TestTypeRenderer has the same rendering behavior with the real one in Runtime,
but returns the result as a string rather than writing to a file.

Here is an example about using TestTypeRenderer with Jest:

```typescript
// Suppose you have defined a macro called `macroLoad`
const yourExports = {
  '@load': {
    macros: [macroLoad],
  },
  '@helper': {
    code: `export const a = 1`,
    customTypes: `export const a: number`,
  },
}
const render = createTestTypeRenderer()
expect(render(yourExports)).toMatchSnapshot()
```

### 🎨 Use Your Macros

You can treat macros [as normal functions](#-use-macros) that cannot be re-assigned:
they also have parameter types, return value types, comments, overloading, and can be nested;
no special syntax, no special characters.

What you need to care about is how to put macros into your project.

Some concepts you need to know have been covered
in the previous documentation. You can view them quickly by below links:

- [MacroPlugin](#-macroplugin-for-macro-authors)
- [MacroManager](#-macromanager-for-macro-users)
- [vitePluginMacro](#-vitepluginmacro-for-macro-users)

After you add the MacroPlugin or MacroManager in the Vite/Rollup config,
you can either add the generated type declaration file to your `tsconfig.json`
or import it in your existed type declaration file,
just like the [Getting Started](#-add-dts-to-your-project) part shows.

However, notice that the type declaration file can only be generated when Vite or Rollup starts;
if you need to build projects in CI environment, please put the type declaration file under version control,
_or remove the type-check commands before Vite/Rollup starts in your build script_.

Maybe helpful: [examples](/examples).
