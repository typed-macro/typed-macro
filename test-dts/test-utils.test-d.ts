import { expectType } from './utils'
import {
  createTestEnvContext,
  createTestRuntime,
  createTestTransformer,
  createTestTypeRenderer,
  TestEnvContextOptions,
  TestRuntime,
  TestRuntimeOptions,
  TestTransformer,
  TestTransformerContext,
  TestTransformerOptions,
  TestTypeRenderer,
} from '@typed-macro/test-utils'
import {
  defineMacro,
  defineMacroProvider,
  EnvContext,
  Modules,
} from '@typed-macro/core'

describe('test env context', () => {
  expectType<EnvContext>(createTestEnvContext())
  expectType<EnvContext>(createTestEnvContext({}))
  expectType<TestEnvContextOptions>({ watchOptions: {} })
  expectType<TestEnvContextOptions>({ modules: false })
  expectType<TestEnvContextOptions>({ modules: true })
  expectType<TestEnvContextOptions>({ modules: {} as Modules })
})

describe('test transformer', () => {
  expectType<TestTransformer>(
    createTestTransformer({
      macros: {},
    })
  )
  expectType<TestTransformerOptions>({ macros: {}, parserPlugins: [] })
  expectType<TestTransformerOptions>({ macros: {}, maxTraversals: -1 })
  expectType<TestTransformerOptions>({
    macros: {
      '@a': [
        defineMacro('')
          .withSignature('')
          .withHandler(({ path }) => path.remove()),
      ],
    },
  })

  const transform = createTestTransformer({ macros: {} })
  expectType<string>(transform(''))
  expectType<string>(transform({ code: '' }))

  expectType<TestTransformerContext>({
    code: '',
    filepath: '',
  })

  expectType<TestTransformerContext>({
    code: '',
    filepath: '',
    env: createTestEnvContext(),
  })
})

describe('test renderer', () => {
  const render = createTestTypeRenderer()
  expectType<TestTypeRenderer>(render)
  expectType<string>(render({}))
})

describe('test runtime', () => {
  const provider = defineMacroProvider({ id: '', exports: {} })
  expectType<TestRuntime>(
    createTestRuntime({
      provider: [provider],
    })
  )
  expectType<TestRuntimeOptions>({
    provider: provider,
  })
  expectType<TestRuntimeOptions>({
    provider: provider,
    env: createTestEnvContext(),
    transformer: {},
    filter: {},
  })
})
