import { defineMacro, defineMacroProvider } from '@typed-macro/core'
import { createMacroPlugin } from '../src'
import { createMacroRemoveOnProd } from '../../core/__tests__/macros'
import { withTempPath } from '../../runtime/__tests__/utils'

describe('VitePluginMacro', () => {
  const provider = defineMacroProvider({
    id: 'test',
    exports: { '@macros': { macros: [createMacroRemoveOnProd()] } },
  })

  const code = `
    import { dev } from '@macros'
    let a = 0
    dev(a)
    `

  const prodConfig = {
    isProduction: true,
    build: {
      ssr: 'some.ts',
    },
  } as any

  const devConfig = {
    isProduction: false,
    build: {
      ssr: 'some.ts',
    },
  } as any

  it('should work', async () => {
    await withTempPath('./macros.d.ts', async (typesPath) => {
      // dev=false, ssr=true
      {
        const plugin = createMacroPlugin({
          typesPath,
        })

        const onStop = jest.fn()
        // use provider

        plugin.use(
          defineMacroProvider({
            id: 'test',
            exports: { '@macros': { macros: [createMacroRemoveOnProd()] } },
            hooks: { onStop },
          })
        )

        await plugin.configResolved!(prodConfig)

        expect(await plugin.resolveId!.call({} as any, '@macros', '', {})).toBe(
          '@macros'
        )
        expect(await plugin.load!.call({} as any, '@macros')).toBe('export {}')

        expect(
          await plugin.transform!.call({} as any, code, 'test.ts')
        ).toMatchSnapshot()

        expect(
          await plugin.transform!.call({} as any, code, 'test.noop')
        ).toBeUndefined()

        await plugin.buildEnd!.call({} as any)
        expect(onStop.mock.calls.length).toBe(1)
      }

      // dev=true, ssr=false
      {
        const plugin = createMacroPlugin({
          typesPath,
          dev: true,
          ssr: false,
        })

        // use provider
        plugin.use(provider)
        await plugin.configResolved!(prodConfig)
        expect(
          await plugin.transform!.call({} as any, code, 'test.ts')
        ).toMatchSnapshot()
      }
    })
  })

  it('should support modules/watcher with dev server', async () => {
    // enable server-related
    await withTempPath('./macros.d.ts', async (typesPath) => {
      const plugin = createMacroPlugin({ typesPath })
      let hasModuleInMacro = false
      let hasWatcherInMacro = false

      let hasModuleInHook = false
      let hasWatcherInHook = false

      let hasModuleInFactory = false
      let hasWatcherInFactory = false

      // use provider
      plugin.use(
        defineMacroProvider((env) => {
          hasModuleInFactory = !!env.modules
          hasWatcherInFactory = !!env.watcher

          return {
            id: 'test',
            exports: {
              '@macros': {
                macros: [
                  defineMacro('dev')
                    .withSignature('(): void')
                    .withHandler(({ modules, watcher, path }) => {
                      hasModuleInMacro = !!modules
                      hasWatcherInMacro = !!watcher
                      path.remove()
                    }),
                ],
              },
            },
            hooks: {
              onStart() {
                hasModuleInHook = !!env.modules
                hasWatcherInHook = !!env.watcher
              },
            },
          }
        })
      )

      await plugin.configResolved!(devConfig)
      await plugin.configureServer!({ watcher: {} } as any)
      await plugin.transform!.call({} as any, code, 'test.ts')

      expect(hasModuleInFactory).toBe(true)
      expect(hasWatcherInFactory).toBe(true)
      expect(hasWatcherInMacro).toBe(true)
      expect(hasModuleInMacro).toBe(true)
      expect(hasModuleInHook).toBe(true)
      expect(hasWatcherInHook).toBe(true)
    })
  })
})
