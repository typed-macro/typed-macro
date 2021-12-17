import {
  createHookContainer,
  createRuntime,
  FilterPattern,
  Runtime,
  RuntimeOptions,
} from '@typed-macro/runtime'
import { expectType } from './utils'
import {
  defineMacroProvider,
  EnvContext,
  MacroProviderHooks,
} from '@typed-macro/core'

const env: EnvContext = {
  host: 'test',
  packageManager: 'test',
  projectPath: [],
  dev: true,
  ssr: true,
}

describe('create runtime', () => {
  expectType<Runtime>(
    createRuntime(env, {
      filter: {
        exclude: '',
        include: /test/,
      },
      transformer: {
        parserPlugins: ['decimal'],
        maxTraversals: 5,
      },
    })
  )
  expectType<RuntimeOptions>({})
  expectType<RuntimeOptions>({ filter: {}, transformer: {} })
})

describe('add provider to runtime', () => {
  const runtime = createRuntime(env, {})
  runtime.appendProvider(
    defineMacroProvider({
      id: '',
      exports: {},
    })
  )
})

describe('hooks & hook container', () => {
  expectType<MacroProviderHooks>(createHookContainer())
})

describe('filter', () => {
  expectType<FilterPattern>('')
  expectType<FilterPattern>(/re/)
  expectType<FilterPattern>([/re/])
  expectType<FilterPattern>([''])
  expectType<FilterPattern>(['', /re/])
})
