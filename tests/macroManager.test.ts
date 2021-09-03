import { MacroPlugin, macroPlugin } from '@/macroPlugin'
import { MacroManager, macroManager } from '@/macroManager'
import { macroProvider, MacroProvider } from '@/macroProvider'
import { mockMacro, withDevServer, withTempPath } from './testutils'
import { Runtime } from '@/core/runtime'

// MacroManager is just a simple wrapper of MacroPlugin
describe('MacroManager', () => {
  let _provider: MacroProvider
  let _plugin: MacroPlugin
  let manager: MacroManager
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
            mockMacro('plain', ({ path }, { template }, { prependToBody }) => {
              prependToBody(
                template.statements.ast(
                  `import { hello } from '@helper'; hello('world')`
                )
              )
              path.remove()
            }),
          ],
        },
        types: {},
      },
      options: { transformer: {} },
    })
    _plugin = macroPlugin({
      name: 'plugin',
      hooks: {},
      runtime: new Runtime(
        {
          typeRenderer: { typesPath: '' },
          transformer: {},
        },
        {
          modules: {},
          macros: {
            '@noop': [mockMacro('noop', ({ path }) => path.remove())],
          },
          types: {},
        }
      ),
    })
    manager = macroManager({
      name: 'test',
      runtime: new Runtime({
        typeRenderer: { typesPath: '' },
        transformer: {},
      }),
    })
  })

  it('should support consume providers/plugins', () => {
    expect(() => manager.use(_plugin)).not.toThrow()
    expect(() => manager.use(_provider)).not.toThrow()
  })

  it('should return shallow copy for toPlugin()', () => {
    const pluginA = manager.toPlugin()
    expect(pluginA.length).toBe(1)
    expect(() => manager.use(_plugin)).not.toThrow()
    const pluginB = manager.toPlugin()
    expect(pluginA.length).toBe(1)
    expect(pluginB.length).toBe(2)
  })

  it('should throw error when consume something not a provider/plugin', () => {
    expect(() => manager.use({} as any)).toThrow()
  })

  it('should handle hooks in buildStart() in expected order', async () => {
    await withTempPath('./a.d.ts', async (tempPath) => {
      const manager = macroManager({
        name: 'test',
        runtime: new Runtime({
          transformer: {},
          typeRenderer: { typesPath: tempPath },
        }),
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
          options: { transformer: {} },
        })
      )
      const plugin = manager.toPlugin()[0]
      // rollup
      await plugin.buildStart!.call(null as any, {} as any)
      expect(stack).toEqual(['onRollupStart', 'onStart'])
      // vite
      stack.length = 0
      await withDevServer(async (server) => {
        await plugin.configResolved!.call(null as any, {} as any)
        await plugin.configureServer!.call(null as any, server)
        await plugin.buildStart!.call(null as any, {} as any)
      })
      expect(stack).toEqual(['onViteStart', 'onStart'])
    })
  })
})
