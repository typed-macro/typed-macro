# @typed-macro/core

**For basic concepts, see [documentation for typed-macro](https://github.com/typed-macro/typed-macro/blob/master/DOCUMENTATION.md).**

# Guide

### Define your macro

It's pretty easy to define a macro, as long as you know the
[basic principles of AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) and [basic operation APIs of Babel](https://github.com/jamiebuilds/babel-handbook).

```typescript
import { defineMacro } from '@typed-macro/core'

const echoMacro = defineMacro('echo') // macro builder
  // give macro a function signature
  .withSignature('(msg: Message, repeat?: number): void')
  // custom type will be rendered to the final d.ts file with signatures
  .withCustomType(`export type Message = string`)
  // set the handler for macro
  .withHandler(({ path, args }, { template, types }) => {
    // you can throw errors directly; the error message with the row number and col number
    // of the macro call currently being expanded will be in the terminal.
    // so you don't have to worry about telling users where the wrong code is.
    if (args.length === 0) throw new Error('empty arguments is invalid')
    const firstArg = args[0]
    if (!firstArg.isStringLiteral())
      throw new Error('please use literal string as message')
    const msg = firstArg.node.value

    let repeat = 5
    if (args.length > 1) {
      const secondArg = args[1]
      if (!secondArg.isNumericLiteral())
        throw new Error('please use literal number as repeat')
      repeat = secondArg.node.value
    }

    path.replaceWith(
      template.statement.ast(`console.log("${msg.repeat(repeat)}")`)
    )
  })
```

_The above example is **JUST** to show how to define multiple signatures.
The above scenario is more suitable for using optional parameters
rather than overloading. See [Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html#use-optional-parameters)._

As the above example shows, you should give a name, at least one signature,
maybe with a comment, and a handler function to a macro.
The custom type is optional.

Ideally, macros should be transparent to users;
that is, users can use macros like normal functions.
So it's essential to write types/comments correctly to provide a friendly development experience.

A macro handler receives three arguments: `ctx`, `babel`, and `helper`.

- `ctx` - the transformation context, including the [node path](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#paths) of
  the call expression currently being processed, traversal states, argument nodes, and so on.
- `babel` - a collection of Babel tools, containing
  [@babel/types](https://babeljs.io/docs/en/babel-types),
  [@babel/traverse](https://babeljs.io/docs/en/babel-traverse),
  [@babel/parser](https://babeljs.io/docs/en/babel-parser),
  [@babel/template](https://babeljs.io/docs/en/babel-template).
- `helper` - some functions that wrap Babel tools to make writing macro handlers easier.

In order to handle nested macros correctly,
and reduce the conflict on modifying the AST,
**you can't use asynchronous macro handlers.**

If the handler is a normal function like the above example shows,
the nested macros inside the current call expression will be expanded
automatically before calling the handler.

If the handler is a generator function, you can:

- yield node paths of import statements to collect macros from them,
  _note that macros must be collected before used, or you should wait for the next traversal
  because the runtime collects imported macros automatically before every traversal_
- yield node paths to actively expand macros inside them
- yield undefined to do nothing 😂

e.g.

```typescript
const helloMacro = defineMacro(`hello`)
  .withSignature(`(msg?: string): void`, `output hello message`)
  .withHandler(function* (
    { path, args },
    { template },
    { prependImports, appendToBody }
  ) {
    // do some thing...

    // expand macros inside the current call expression
    yield args

    // do some thing...

    // actively collect the imported macro so it can be used immediately,
    // or you should wait for the next traversal
    yield prependImports({
      moduleName: '@other-macros',
      exportName: 'macro',
      localName: '__macro',
    })

    // insert a macro call and expand it
    yield appendToBody(template.statement.ast(`__macro()`))

    // do some thing..
  })
```

Though sometimes writing these lexical macros themselves is cumbersome enough,
please always keep the following in mind:

- don't forget to remove or replace the macro call expressions,
  otherwise the plugin will process this call expression
  again and again until reach max traversal times
  because there is always a macro call remaining in the source.
- If you replace the current call expression with another call expression,
  the next traversed node will be this new call expression.
  Therefore, if you replace current macro call expression with another macro call,
  please make sure this replacement is not recursive.

### Organize your macros

It is not enough to have defined macros only. Macros should be organized,
at least, into some `modules` so that users can import them.

The most basic organizational unit is `Exportable`.

An `Exportable` contains either **Javascript code** and corresponding types,
or macros and additional types.

```typescript
type Exportable =
  | { macros: Macro[]; types?: string }
  | { code: string; types?: string }
```

_Macro authors often prefer to use external helpers in the expanded code
in order to reduce the final size.
So `Exportable` is designed to be able to contain Javascript code._

`ModularizedExportable` is a collection of `Exportable`s,
establishing the mapping relationship between module name and exportable.

```typescript
type ModularizedExportable = { [moduleName: string]: Exportable }
```

Finally `ModularizedExportable`s should be packaged into providers.

```typescript
import { defineMacroProvider } from '@typed-macro/core'

defineMacroProvider({
  id: 'echo',
  exports: {
    '@macros': {
      macros: [helloMacro],
      types: `export type SomeThing<T> = T`,
    },
    '@helper': {
      code: `export const n = 1`,
    },
  },
})
```

`defineMacroProvider` accepts a builder function if needed.

```typescript
import { defineMacroProvider } from '@typed-macro/core'

defineMacroProvider((env) => {
  return {
    id: 'test',
    exports: {
      '@macros': {
        macros: [],
        types: env.dev ? '...' : '...',
      },
    },
    hooks: {
      onStart() {
        env.watcher?.add(someFile)
      },
    },
    options: {
      parserPlugins: ['decimal'],
    },
  }
})
```

You can get properties of `env` via parameter `ctx` within macro handler,
so you don't need to define macros inside provider builder function.

```typescript
defineMacro(`test`)
  .withSignature(`(): void`)
  .withHandler((ctx) => {
    ctx.dev // env.dev
    ctx.ssr // env.ssr
    ctx.host // env.host
    // ...
  })
```

There are two special object in `env`: `env.watcher` and `env.modules`.
Suppose your macro needs to be re-expanded when an external file changes,
you can use them like below.

```typescript
// in macros
withHandler((ctx) => {
  // ...
  ctx.modules?.setTag(ctx.filepath, 'some_xyz')
  // ...
})

// in hooks
{
  onStart: () => {
    env.watcher?.add(someFile)
    env.watcher?.on('change', (path) => {
      if (path === someFile) {
        env.modules?.invalidateByTag(/^some/)
      }
    })
  }
}
```

Note that `env.watcher` and `env.modules` may be undefined,
of which different runtime wrappers may have different strategies.

### Test your macros

See [@typed-macro/test-utils](https://github.com/typed-macro/typed-macro/blob/master/packages/test-utils/README.md).
