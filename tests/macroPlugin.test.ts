import { isMacroPlugin, MacroPlugin, macroPlugin } from '@/macroPlugin'
import { withTempPath } from './testutils'

describe('macroPlugin() & isMacroPlugin()', () => {
  it('should work', () => {
    expect(
      isMacroPlugin(
        macroPlugin({
          exports: {
            types: {},
            modules: {},
            macros: {},
          },
          hooks: {},
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

describe('MacroPlugin', () => {
  let _plugin: MacroPlugin
  let mockedHook: jest.Mock
  beforeEach(() => {
    mockedHook = jest.fn()
    _plugin = macroPlugin({
      name: 'test',
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
      hooks: {
        transform: mockedHook,
        resolveId: mockedHook,
        load: mockedHook,
        configureServer: mockedHook,
        configResolved: mockedHook,
        buildStart: mockedHook,
      },
      runtimeOptions: {
        transformer: {},
        typeRenderer: { typesPath: '' },
      },
    })
  })

  it('should support to be consumed', () => {
    expect(_plugin.__consume()).toMatchSnapshot()
    // consume more than once
    expect(() => _plugin.__consume()).toThrow()
  })

  it('should handle transform with macro', () => {
    expect(
      _plugin.transform!.call(null as any, `import { echo } from '@echo'`, '')
    ).toBeUndefined()
    expect(
      _plugin.transform!.call(
        null as any,
        `import { echo } from '@echo'; echo()`,
        'a.ts'
      )
    ).toMatchSnapshot()
    expect(mockedHook.mock.calls.length).toBe(2)
  })

  it('should stop handling transform after consumed', () => {
    _plugin.__consume()
    expect(
      _plugin.transform!.call(
        null as any,
        `import { echo } from '@echo'; echo()`,
        'a.ts'
      )
    ).toBeUndefined()
    expect(mockedHook.mock.calls.length).toBe(1)
  })

  it('should handle load properly', () => {
    expect(_plugin.load!.call(null as any, '@helper')).toMatchSnapshot()
    expect(_plugin.load!.call(null as any, '@echo')).toMatchSnapshot()

    expect(_plugin.load!.call(null as any, '@others')).toBeUndefined()
    expect(mockedHook.mock.calls.length).toBe(1)
  })

  it('should stop handling load after consumed', () => {
    _plugin.__consume()
    expect(_plugin.load!.call(null as any, '@helper')).toBeUndefined()
    expect(_plugin.load!.call(null as any, '@echo')).toBeUndefined()
    expect(_plugin.load!.call(null as any, '@others')).toBeUndefined()
    expect(mockedHook.mock.calls.length).toBe(3)
  })

  it('should handle resolveId properly', () => {
    expect(_plugin.resolveId!.call(null as any, '@helper', '', {})).toBe(
      '@helper'
    )
    expect(_plugin.resolveId!.call(null as any, '@echo', '', {})).toBe('@echo')

    expect(
      _plugin.resolveId!.call(null as any, '@others', '', {})
    ).toBeUndefined()
    expect(mockedHook.mock.calls.length).toBe(1)
  })

  it('should stop handling resolveId after consumed', () => {
    _plugin.__consume()
    expect(
      _plugin.resolveId!.call(null as any, '@helper', '', {})
    ).toBeUndefined()
    expect(
      _plugin.resolveId!.call(null as any, '@echo', '', {})
    ).toBeUndefined()
    expect(
      _plugin.resolveId!.call(null as any, '@others', '', {})
    ).toBeUndefined()
    expect(mockedHook.mock.calls.length).toBe(3)
  })

  it('should handle buildStart properly', (done) => {
    withTempPath('a.d.ts', async (tempPath) => {
      _plugin = macroPlugin({
        name: 'test',
        exports: {
          modules: {},
          macros: {},
          types: {},
        },
        hooks: { buildStart: mockedHook },
        runtimeOptions: {
          transformer: {},
          typeRenderer: { typesPath: tempPath },
        },
      })
      await _plugin.buildStart!.call(null as any, {} as any)
      expect(mockedHook.mock.calls.length).toBe(1)
      done()
    })
  })

  it('should handle configResolved properly', async () => {
    await _plugin.configResolved!.call(null as any, {} as any)
    expect(mockedHook.mock.calls.length).toBe(1)
  })
})
