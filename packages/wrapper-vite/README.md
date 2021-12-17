# vite-plugin-macro

## Getting Started

```shell
$ npm install -D vite-plugin-macro
# or
$ yarn add -D vite-plugin-macro
```

## Usage

**For more details, see [documentation for typed-macro](https://github.com/typed-macro/typed-macro/blob/master/DOCUMENTATION.md).**

```typescript
// vite.config.ts

import { defineConfig } from 'vite'
// a package or module that exports macro provider
import { provideEcho } from 'some-macro-provider'
import { createMacroPlugin } from 'vite-plugin-macro'
import { join } from 'path'

const macroPlugin = createMacroPlugin({
  // the generated `.d.ts` file will include the types of macros
  typesPath: join(__dirname, './macros.d.ts'),
}).use(provideEcho()) // use a macro provider

export default defineConfig({
  plugins: [macroPlugin],
})
```

This package also re-exports `@typed-macro/core`
so you can define macros directly in your projects.
