import { assertNoDuplicatedNamespace, Runtime } from '@/core/runtime'
import { macroSerializer, mockMacro, mockRuntime } from '../testutils'

expect.addSnapshotSerializer(macroSerializer)

describe('assertNoDuplicatedNamespace()', () => {
  it('should work', () => {
    expect(() => assertNoDuplicatedNamespace(['a'], ['b'])).not.toThrow()
    expect(() => assertNoDuplicatedNamespace(['a', 'b'], ['c', 'b'])).toThrow()
  })
})

describe('Runtime', () => {
  let runtime: Runtime
  beforeEach(() => {
    runtime = mockRuntime()
  })

  it('should work with setDevMode()', () => {
    runtime.setDevMode()
    expect((runtime as any).devMode).toBe(true)
  })

  it('should work with addExports() and .exports', () => {
    runtime.addExports({
      macros: { '@m1': [mockMacro('m')] },
      modules: { '@u1': 'export const a = 1' },
      types: {},
    })
    expect(runtime.exports).toMatchSnapshot()
    runtime.addExports({
      macros: { '@m2': [mockMacro('m')] },
      modules: { '@u2': 'export const a = 1' },
      types: {},
    })
    expect(runtime.exports).toMatchSnapshot()
    expect(() => {
      runtime.addExports({
        macros: { '@m2': [] },
        modules: {},
        types: {},
      })
    }).toThrow()
    expect(() => {
      runtime.addExports({
        macros: {
          '@m3': [mockMacro('m'), mockMacro('m')],
        },
        modules: {},
        types: {},
      })
    }).toThrow()
  })

  it('should work with mergeOptions() and .options', () => {
    expect(runtime.options.transformer).toEqual({})
    runtime.mergeOptions({})
    expect(runtime.options.transformer).toEqual({})
    runtime.mergeOptions({ transformer: { parserPlugins: ['topLevelAwait'] } })
    expect(runtime.options.transformer.parserPlugins).toEqual(['topLevelAwait'])
    runtime.mergeOptions({
      transformer: { parserPlugins: ['topLevelAwait', 'decorators'] },
    })
    expect(runtime.options.transformer.parserPlugins).toEqual([
      'topLevelAwait',
      'decorators',
    ])
    runtime.mergeOptions({
      transformer: { maxRecursions: 5 },
    })
    expect(runtime.options.transformer.maxRecursions).toBeUndefined()
  })

  it('should work with handleLoad/handleResolveId()', () => {
    runtime.addExports({
      macros: { '@m': [mockMacro('m')] },
      modules: { '@u': 'export const a = 1' },
      types: {},
    })
    expect(runtime.handleLoad('@m')).toMatchSnapshot()
    expect(runtime.handleLoad('@u')).toMatchSnapshot()
    expect(runtime.handleLoad('@n')).toBeUndefined()

    expect(runtime.handleResolveId('@m')).toMatchSnapshot()
    expect(runtime.handleResolveId('@u')).toMatchSnapshot()
    expect(runtime.handleResolveId('@n')).toBeUndefined()
  })

  it('should work with handleTransform()', () => {
    runtime.addExports({
      macros: {
        '@m': [
          mockMacro('m', ({ path }) => {
            path.remove()
          }),
        ],
      },
      modules: {},
      types: {},
    })
    // no macro
    expect(
      runtime.handleTransform(`console.log('hello')`, 'test.js')
    ).toBeUndefined()
    // not valid filename
    expect(
      runtime.handleTransform(`import {m} from '@m'; m()`, 'a')
    ).toBeUndefined()

    expect(
      runtime.handleTransform(
        `import {m} from '@m'; m(); console.log('helloworld')`,
        'test.js'
      )
    ).toMatchSnapshot()
  })

  it('should work with typeRenderer()', () => {
    runtime.addExports({
      macros: {},
      modules: {},
      types: {
        '@t': {
          moduleScope: ['type A = string'],
          macroScope: [],
        },
      },
    })

    expect(runtime.typeRenderer.render()).toMatchSnapshot()

    runtime.addExports({
      macros: {},
      modules: {},
      types: {
        '@n': {
          moduleScope: ['type B = string'],
          macroScope: [`export function a(): void`],
        },
      },
    })

    // update after register new
    expect(runtime.typeRenderer.render()).toMatchSnapshot()

    const update = runtime.typeRenderer.append('@l', 'type C = string')
    expect(runtime.typeRenderer.render()).toMatchSnapshot()
    update('type G = number')
    expect(runtime.typeRenderer.render()).toMatchSnapshot()
  })
})
