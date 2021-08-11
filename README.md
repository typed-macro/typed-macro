# vite-plugin-macro

[![npm version](https://badgen.net/npm/v/vite-plugin-macro)](https://www.npmjs.com/package/vite-plugin-macro)
[![monthly downloads](https://badgen.net/npm/dm/vite-plugin-macro)](https://www.npmjs.com/package/vite-plugin-macro)
[![license](https://badgen.net/npm/license/vite-plugin-macro)](https://github.com/unbyte/vite-plugin-macro/blob/master/LICENSE)
![types](https://badgen.net/npm/types/vite-plugin-macro)

> Help create macro plugins for [vite](https://github.com/vitejs/vite).

## Getting Started

**Install**

```bash
$ npm install -D vite-plugin-macro
# or
# yarn add -D vite-plugin-macro
```

**Define a macro**

```typescript
import { defineMacro } from 'vite-plugin-macro'

const echoMacro = defineMacro('echo')
  .withSignature('(msg: string, repeat?: number): void')
  .withHandler(({ path, args }, { template, types }, { run }) => {
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

**Define plugin**

```typescript
import { join } from 'path'

defineMacroPlugin({
  exports: {
    '@echo': {
      macros: [macroEcho],
    },
  },
  dtsPath: join(__dirname, 'macros.d.ts'),
})
```

**Register type declaration file**

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

> Type declaration file will be created automatically when vite dev server starts.

**Use macros**

Then you can import macros from namespace and call them as normal function.

```typescript
import { echo } from '@echo'

echo('yeah', 3)
// echo('yeah yeah yeah')
```

### Examples

See [Examples](https://github.com/unbyte/vite-plugin-macro/tree/master/examples/)

## Options

### Plugin Options

🚧 TBD

### Macro Options

## License

MIT License © 2021 [unbyte](https://github.com/unbyte)
