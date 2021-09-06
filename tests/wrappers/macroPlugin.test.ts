import { Runtime } from '@/core/runtime'
import { isMacroPlugin, MacroPlugin, macroPlugin } from '@/wrappers/macroPlugin'
import {
  macroSerializer,
  mockMacro,
  mockRuntime,
  withDevServer,
  withTempPath,
} from '../testutils'

expect.addSnapshotSerializer(macroSerializer)

describe('macroPlugin() & isMacroPlugin()', () => {
  it('should work', () => {
    expect(
      isMacroPlugin(
        macroPlugin({
          hooks: {},
          name: 'test',
          runtime: new Runtime({
            typeRenderer: { typesPath: '' },
            transformer: {},
            filter: {},
          }),
        })
      )
    ).toBe(true)
    expect(isMacroPlugin(undefined)).toBe(false)
    expect(isMacroPlugin(false)).toBe(false)
  })
})

describe('MacroPlugin', () => {
  it('should support to be consumed', () => {
    const plugin = macroPlugin({
      name: 'test',
      hooks: {},
      runtime: mockRuntime(
        {},
        {
          modules: {
            '@helper': `export function hello(msg) {console.log(msg)}`,
          },
          macros: {
            '@echo': [
              mockMacro('echo', ({ path }, { template }, { prependToBody }) => {
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
        }
      ),
    })
    expect(plugin.__consume()).toMatchSnapshot()
    // consume more than once
    expect(() => plugin.__consume()).toThrow()
  })
})

describe('MacroPlugin Hooks', () => {
  let mockedHook: jest.Mock
  let plugin: MacroPlugin
  beforeEach(() => {
    mockedHook = jest.fn()
    plugin = macroPlugin({
      name: 'test',
      hooks: {
        transform: mockedHook,
        resolveId: mockedHook,
        load: mockedHook,
        configureServer: mockedHook,
        configResolved: mockedHook,
        buildStart: mockedHook,
      },
      runtime: mockRuntime(
        {},
        {
          modules: {
            '@helper': `export function hello(msg) {console.log(msg)}`,
          },
          macros: {
            '@echo': [
              mockMacro('echo', ({ path }, { template }, { prependToBody }) => {
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
        }
      ),
    })
  })

  it('should handle transform with macro', () => {
    expect(
      plugin.transform!.call(null as any, `import { echo } from '@echo'`, '')
    ).toBeUndefined()
    expect(
      plugin.transform!.call(
        null as any,
        `import { echo } from '@echo'; echo()`,
        'a.ts'
      )
    ).toMatchSnapshot()
    expect(mockedHook.mock.calls.length).toBe(2)
  })

  it('should handle load properly', () => {
    expect(plugin.load!.call(null as any, '@helper')).toMatchSnapshot()
    expect(plugin.load!.call(null as any, '@echo')).toMatchSnapshot()

    expect(plugin.load!.call(null as any, '@others')).toBeUndefined()
    expect(mockedHook.mock.calls.length).toBe(1)
  })

  it('should handle resolveId properly', () => {
    expect(plugin.resolveId!.call(null as any, '@helper', '', {})).toBe(
      '@helper'
    )
    expect(plugin.resolveId!.call(null as any, '@echo', '', {})).toBe('@echo')

    expect(
      plugin.resolveId!.call(null as any, '@others', '', {})
    ).toBeUndefined()
    expect(mockedHook.mock.calls.length).toBe(1)
  })

  it('should handle buildStart properly', async () => {
    await withTempPath('a.d.ts', async (tempPath) => {
      plugin = macroPlugin({
        name: 'test',
        runtime: mockRuntime({ typeRenderer: { typesPath: tempPath } }),
        hooks: { buildStart: mockedHook },
      })
      await plugin.buildStart!.call(null as any, {} as any)
      expect(mockedHook.mock.calls.length).toBe(1)
    })
  })

  it('should handle configResolved properly', async () => {
    await plugin.configResolved!.call(null as any, {} as any)
    expect(mockedHook.mock.calls.length).toBe(1)
  })

  it('should handle configureServer properly', async () => {
    await withDevServer(async (server) => {
      await plugin.configureServer!.call(null as any, server)
      expect(mockedHook.mock.calls.length).toBe(1)
    })
  })

  // __CONSUMED__

  it('should stop handling transform after consumed', () => {
    plugin.__consume()
    expect(
      plugin.transform!.call(
        null as any,
        `import { echo } from '@echo'; echo()`,
        'a.ts'
      )
    ).toBeUndefined()
    expect(mockedHook.mock.calls.length).toBe(1)
  })

  it('should stop handling load after consumed', () => {
    plugin.__consume()
    expect(plugin.load!.call(null as any, '@helper')).toBeUndefined()
    expect(plugin.load!.call(null as any, '@echo')).toBeUndefined()
    expect(plugin.load!.call(null as any, '@others')).toBeUndefined()
    expect(mockedHook.mock.calls.length).toBe(3)
  })

  it('should stop handling resolveId after consumed', () => {
    plugin.__consume()
    expect(
      plugin.resolveId!.call(null as any, '@helper', '', {})
    ).toBeUndefined()
    expect(plugin.resolveId!.call(null as any, '@echo', '', {})).toBeUndefined()
    expect(
      plugin.resolveId!.call(null as any, '@others', '', {})
    ).toBeUndefined()
    expect(mockedHook.mock.calls.length).toBe(3)
  })
})
