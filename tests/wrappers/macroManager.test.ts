import { MacroPlugin, macroPlugin } from '@/wrappers/macroPlugin'
import { MacroManager, macroManager } from '@/wrappers/macroManager'
import {
  macroProvider,
  MacroProvider,
  ViteStartContext,
} from '@/wrappers/macroProvider'
import {
  mockExports,
  mockMacro,
  mockRuntime,
  withDevServer,
  withTempPath,
} from '#/testutils'
import { VersionedPlugin, VersionedProvider } from '@/wrappers/compat'

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
    })
    _plugin = macroPlugin({
      name: 'plugin',
      hooks: {},
      runtime: mockRuntime(
        {},
        mockExports({
          macros: {
            '@noop': [mockMacro('noop', ({ path }) => path.remove())],
          },
        })
      ),
    })
    manager = macroManager({
      name: 'test',
      runtime: mockRuntime(),
    })
  })

  it('should support consume providers/plugins', () => {
    expect(() => manager.use(_plugin)).not.toThrow()
    expect(() => manager.use(_provider)).not.toThrow()
  })

  it('should support consume providers/plugins arrays', () => {
    expect(() => manager.use([_plugin, _provider])).not.toThrow()
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
        runtime: mockRuntime({ typeRenderer: { typesPath: tempPath } }),
      })

      const stack: string[] = []
      let viteStartCtx: ViteStartContext | undefined
      manager.use(
        macroProvider({
          id: 'provider',
          hooks: {
            onRollupStart: () => {
              stack.push('onRollupStart')
            },
            onViteStart: (ctx) => {
              viteStartCtx = ctx
              stack.push('onViteStart')
            },
            onStart: () => {
              stack.push('onStart')
            },
          },
          exports: mockExports(),
        })
      )
      const plugin = manager.toPlugin()[0]
      // rollup
      await plugin.buildStart!.call(null as any, {} as any)
      expect(stack).toEqual(['onRollupStart', 'onStart'])
      // vite dev
      stack.length = 0
      await withDevServer(async (server) => {
        await plugin.configResolved!.call(null as any, {} as any)
        await plugin.configureServer!.call(null as any, server)
        await plugin.buildStart!.call(null as any, {} as any)
      })
      expect(viteStartCtx!.dev).toBe(true)
      expect((viteStartCtx as any).server).not.toBeUndefined()
      expect((viteStartCtx as any).helper).not.toBeUndefined()
      expect((viteStartCtx as any).config).not.toBeUndefined()
      expect(stack).toEqual(['onViteStart', 'onStart'])
    })
  })

  it('should not pass server/helper when vite in build mode', async () => {
    await withTempPath('./a.d.ts', async (tempPath) => {
      const manager = macroManager({
        name: 'test',
        runtime: mockRuntime({ typeRenderer: { typesPath: tempPath } }),
      })

      let viteStartCtx: ViteStartContext | undefined
      manager.use(
        macroProvider({
          id: 'provider',
          hooks: {
            onViteStart: (ctx) => {
              viteStartCtx = ctx
            },
          },
          exports: mockExports(),
        })
      )
      const plugin = manager.toPlugin()[0]
      // vite build
      await plugin.configResolved!.call(null as any, {} as any)
      await plugin.buildStart!.call(null as any, {} as any)
      expect(viteStartCtx!.dev).toBe(false)
      expect((viteStartCtx as any).server).toBeUndefined()
      expect((viteStartCtx as any).helper).toBeUndefined()
      expect((viteStartCtx as any).config).not.toBeUndefined()
    })
  })

  it('should check the compatibility of plugins/providers ', () => {
    const manager = macroManager({ name: 'test', runtime: mockRuntime() })

    // provider
    const provider = macroProvider({
      id: '',
      exports: mockExports(),
      hooks: {},
    })
    expect(() => manager.use(provider)).not.toThrow()
    ;(provider as VersionedProvider).$__provider_version = -1
    expect(() => manager.use(provider)).toThrow()

    // plugin
    expect(() =>
      manager.use(macroPlugin({ name: '', runtime: mockRuntime(), hooks: {} }))
    ).not.toThrow()
    const plugin = macroPlugin({ name: '', runtime: mockRuntime(), hooks: {} })
    ;(plugin as VersionedPlugin).$__plugin_version = -1
    expect(() => manager.use(plugin)).toThrow()
  })
})
