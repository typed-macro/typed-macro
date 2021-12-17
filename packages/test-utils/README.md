# @typed-macro/test-utils

**For basic concepts, see [documentation for typed-macro](https://github.com/typed-macro/typed-macro/blob/master/DOCUMENTATION.md).**

## Utils

### TestTransformer

TestTransformer is a wrapper of the Transformer inside the Runtime.

```typescript
type TestTransformer = {
  (ctx: TestTransformerContext): string
  (code: string): string
}
```

Here is an example about using TestTransformer with Jest:

```typescript
import {
  createTestEnvContext,
  createTestTransformer,
} from '@typed-macro/test-utils'

const devEnv = createTestEnvContext({ dev: true })
const transform = createTestTransformer({
  macros: {
    '@macros': [...someMacros],
  },
})
expect(transform(`...some code`)).toMatchSnapshot()
expect(transform({ code: `...some code`, env: devEnv })).toMatchSnapshot()
```

### TestTypeRenderer

TestTypeRenderer is a wrapper of the type renderer in Runtime,
returning the result as a string rather than writing to a file.

Here is an example about using TestTypeRenderer with Jest:

```typescript
import { createTestTypeRenderer } from '@typed-macro/test-utils'

const yourExports = {
  '@load': {
    macros: [...someMacros],
  },
  '@helper': {
    code: `export const a = 1`,
    customTypes: `export const a: number`,
  },
}
const render = createTestTypeRenderer()
expect(render(yourExports)).toMatchSnapshot()
```

### TestRuntime

TestRuntime is a wrapper of the Runtime
with more options and more friendly methods for test.

```typescript
const runtime = createTestRuntime({
  provider: [yourProvider],
  env: createTestEnvContext({ dev: false }),
})

expect(await runtime.transform(`...`, 'test.ts')).toMatchSnapshot()
```
