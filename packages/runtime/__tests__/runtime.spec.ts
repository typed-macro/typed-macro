import { createRuntime, Runtime } from '../src'
import { defineMacroProvider, EnvContext } from '@typed-macro/core'
import { createMacroRemove } from '../../core/__tests__/macros'

describe('Runtime', () => {
  const env: EnvContext = {
    host: 'test',
    packageManager: 'test',
    projectPath: [''],
    dev: true,
    ssr: false,
  }
  let runtime: Runtime
  beforeEach(() => {
    runtime = createRuntime(env, {})
  })

  it('should support add providers', () => {
    const provider = defineMacroProvider({
      id: 'provider',
      exports: {},
    })
    expect(() => runtime.appendProvider(provider)).not.toThrowError()
  })

  it('should support reject invalid providers', () => {
    expect(() => runtime.appendProvider({} as any)).toThrowError()
    const provider = defineMacroProvider({
      id: 'provider',
      exports: {},
    })
    provider.version = 'unknown'
    expect(() => runtime.appendProvider(provider)).toThrowError()
  })

  it('should support reject duplicated macros', () => {
    const provider = defineMacroProvider({
      id: 'provider',
      exports: {
        a: {
          macros: [createMacroRemove()],
        },
      },
    })
    runtime.appendProvider(provider)
    expect(() => runtime.appendProvider(provider)).toThrowError()
  })

  it('should support reject duplicated codes', () => {
    const provider = defineMacroProvider({
      id: 'provider',
      exports: {
        a: {
          code: `export let a = 1`,
        },
      },
    })
    runtime.appendProvider(provider)
    expect(() => runtime.appendProvider(provider)).toThrowError()
  })

  it('should support reject duplicated codes', () => {
    const provider = defineMacroProvider({
      id: 'provider',
      exports: {
        a: {
          code: `export let a = 1`,
        },
      },
    })
    runtime.appendProvider(provider)
    expect(() => runtime.appendProvider(provider)).toThrowError()
  })

  it('should work', async () => {
    const executedHooks: string[] = []
    const provider = defineMacroProvider({
      id: 'provider',
      exports: {
        a: { code: `export let a = 1` },
        b: { macros: [createMacroRemove()] },
      },
      hooks: {
        onStart() {
          executedHooks.push('hook.onStart')
        },
        onFilter(id) {
          executedHooks.push(`hook.onFilter: ${id}`)
          return true
        },
        beforeTransform(code, id) {
          executedHooks.push(`hook.beforeTransform: ${id}`)
          return code + '\nexport let a = 1'
        },
        afterTransform(code, id) {
          executedHooks.push(`hook.afterTransform: ${id}`)
          return code + '\nexport let b = 2'
        },
        onStop() {
          executedHooks.push('hook.onStop')
        },
      },
      options: {
        parserPlugins: ['decimal'],
      },
    })
    runtime.appendProvider(provider)

    await runtime.start()
    expect(runtime.resolveId('test.ts')).toBeUndefined()
    expect(runtime.resolveId('a')).toBe('a')
    await runtime.filter('test.ts')
    // filter reject .vue by default, so `onFilter` will be called
    await runtime.filter('test.vue')
    expect(runtime.load('a')).toMatchSnapshot()
    expect(
      await runtime.transform(
        `
    import { noop } from 'b'
    noop(0.3m)`,
        'test.ts'
      )
    ).toMatchSnapshot()
    await runtime.stop()
    expect(executedHooks).toMatchSnapshot()
  })
})
