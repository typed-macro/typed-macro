import { normalizeMacroProvider } from '../src'
import {
  defineMacroProvider,
  EnvContext,
  MacroProvider,
} from '@typed-macro/core'
import { createMacroRemove } from '../../core/__tests__/macros'

describe('function normalizeMacroProvider()', () => {
  let provider: MacroProvider
  beforeEach(() => {
    provider = defineMacroProvider((env) => {
      return {
        id: 'test',
        exports: {
          a: {
            macros: env.ssr ? [createMacroRemove()] : [],
          },
          b: {
            code: 'export const value = 1',
            types: 'export const value: number',
          },
        },
      }
    })
  })

  it('should work', () => {
    expect(
      normalizeMacroProvider(provider, {
        host: 'test',
        packageManager: 'test',
        projectPath: [''],
        dev: true,
        ssr: false,
      })
    ).toMatchSnapshot()
    expect(
      normalizeMacroProvider(provider, {
        host: 'test',
        packageManager: 'test',
        projectPath: [''],
        dev: true,
        ssr: true,
      })
    ).toMatchSnapshot()
  })

  it('should reject invalid providers', () => {
    const env: EnvContext = {
      host: 'test',
      packageManager: 'test',
      projectPath: [''],
      dev: true,
      ssr: false,
    }

    expect(() => normalizeMacroProvider({} as any, env)).toThrowError()

    // version
    provider.version = 'unknown'
    expect(() => normalizeMacroProvider(provider, env)).toThrowError()
  })

  it('should reject invalid providers', () => {
    const env: EnvContext = {
      host: 'test',
      packageManager: 'test',
      projectPath: [''],
      dev: true,
      ssr: false,
    }

    provider = defineMacroProvider({
      id: 'test',
      exports: { a: { macros: ['' as any] } },
    })

    // invalid provider
    expect(() => normalizeMacroProvider({} as any, env)).toThrowError()

    // invalid macro
    expect(() => normalizeMacroProvider(provider, env)).toThrowError()

    // invalid macro version
    const m = createMacroRemove()
    m.version = 'unknown'
    provider = defineMacroProvider({
      id: 'test',
      exports: { a: { macros: [m] } },
    })
    expect(() => normalizeMacroProvider(provider, env)).toThrowError()
  })
})
