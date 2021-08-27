import { MacroPlugin, macroPlugin } from '@/macroPlugin'
import { isMacroManager, MacroManager, macroManager } from '@/macroManager'
import { macroProvider, MacroProvider } from '@/macroProvider'
import { withTempPath } from './testutils'

describe('macroManager() & isMacroManager()', () => {
  it('should work', () => {
    expect(
      isMacroManager(
        macroManager({
          name: 'test',
          runtimeOptions: {
            typeRenderer: {
              typesPath: '',
            },
            transformer: {},
          },
        })
      )
    ).toBe(true)
  })
})

// No need to test MacroManagerContext because
// MacroManager is just a simple wrapper of it
describe('MacroManager', () => {
  let _provider: MacroProvider
  let _plugin: MacroPlugin
  let _manager: MacroManager
  beforeEach(() => {
    _provider = macroProvider({
      id: 'provider',
      hooks: {},
      exports: {
        modules: {
          '@helper': `export function hello(msg) {console.log(msg)}`,
        },
        macros: {
          '@echo': [
            {
              name: 'echo',
              apply: ({ path }, { template }, { prependToBody }) => {
                prependToBody(
                  template.statements.ast(
                    `import { hello } from '@helper'; hello('world')`
                  )
                )
                path.remove()
              },
            },
          ],
        },
        types: {},
      },
    })
    _plugin = macroPlugin({
      name: 'plugin',
      hooks: {},
      runtimeOptions: {
        typeRenderer: { typesPath: '' },
        transformer: {},
      },
      exports: {
        modules: {},
        macros: {
          '@noop': [
            {
              name: 'noop',
              apply: ({ path }) => path.remove(),
            },
          ],
        },
        types: {},
      },
    })
    _manager = macroManager({
      name: 'test',
      runtimeOptions: {
        transformer: {},
        typeRenderer: { typesPath: '' },
      },
    })
  })

  it('should support consume providers/plugins', () => {
    expect(_manager.length).toBe(1)
    expect(() => _manager.use(_plugin)).not.toThrow()
    expect(() => _manager.use(_provider)).not.toThrow()
    expect(_manager.length).toBe(2)
  })

  it('should throw error when consume something not a provider/plugin', () => {
    expect(() => _manager.use({} as any)).toThrow()
  })

  it('should handle transform with macro', () => {
    _manager.use(_provider)
    const realPlugin = _manager[0]

    expect(
      realPlugin.transform!.call(
        null as any,
        `import { echo } from '@echo'`,
        ''
      )
    ).toBeUndefined()
    expect(
      realPlugin.transform!.call(
        null as any,
        `import { echo } from '@echo'; echo()`,
        'a.ts'
      )
    ).toMatchSnapshot()
  })

  it('should handle load properly', () => {
    _manager.use(_provider)
    const realPlugin = _manager[0]

    expect(realPlugin.load!.call(null as any, '@helper')).toMatchSnapshot()
    expect(realPlugin.load!.call(null as any, '@echo')).toMatchSnapshot()

    expect(realPlugin.load!.call(null as any, '@others')).toBeUndefined()
  })

  it('should handle resolveId properly', () => {
    _manager.use(_provider)
    const realPlugin = _manager[0]

    expect(realPlugin.resolveId!.call(null as any, '@helper', '', {})).toBe(
      '@helper'
    )
    expect(realPlugin.resolveId!.call(null as any, '@echo', '', {})).toBe(
      '@echo'
    )

    expect(
      realPlugin.resolveId!.call(null as any, '@others', '', {})
    ).toBeUndefined()
  })

  it('should handle hooks in buildStart() in expected order', (done) => {
    withTempPath('./a.d.ts', async (tempPath) => {
      const manager = macroManager({
        name: 'test',
        runtimeOptions: {
          transformer: {},
          typeRenderer: { typesPath: tempPath },
        },
      })

      const stack: string[] = []
      manager.use(
        macroProvider({
          id: 'provider',
          hooks: {
            onRollupStart: () => {
              stack.push('onRollupStart')
            },
            onViteStart: () => {
              stack.push('onViteStart')
            },
            onStart: () => {
              stack.push('onStart')
            },
          },
          exports: { modules: {}, macros: {}, types: {} },
        })
      )
      const realPlugin = manager[0]
      // rollup
      await realPlugin.buildStart!.call(null as any, {} as any)
      expect(stack).toEqual(['onRollupStart', 'onStart'])
      // vite
      stack.length = 0
      await realPlugin.configResolved!.call(null as any, {} as any)
      await realPlugin.buildStart!.call(null as any, {} as any)
      expect(stack).toEqual(['onViteStart', 'onStart'])
      done()
    })
  })
})
