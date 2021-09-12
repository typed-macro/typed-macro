import { assertNoDuplicatedNamespace, Runtime } from '@/core/runtime'
import {
  macroSerializer,
  mockExports,
  mockMacro,
  mockRuntime,
} from '#/testutils'
import { VersionedMacro } from '@/core/compat'

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
    runtime.addExports(
      mockExports({
        macros: { '@m1': [mockMacro('m')] },
        modules: { '@u1': 'export const a = 1' },
      })
    )
    expect(runtime.exports).toMatchSnapshot()
    runtime.addExports(
      mockExports({
        macros: { '@m2': [mockMacro('m')] },
        modules: { '@u2': 'export const a = 1' },
      })
    )
    expect(runtime.exports).toMatchSnapshot()
    expect(() => {
      runtime.addExports(mockExports({ macros: { '@m2': [] } }))
    }).toThrow()
    expect(() => {
      runtime.addExports(
        mockExports({ macros: { '@m3': [mockMacro('m'), mockMacro('m')] } })
      )
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
    runtime.addExports(
      mockExports({
        macros: { '@m': [mockMacro('m')] },
        modules: { '@u': 'export const a = 1' },
      })
    )
    expect(runtime.handleLoad('@m')).toMatchSnapshot()
    expect(runtime.handleLoad('@u')).toMatchSnapshot()
    expect(runtime.handleLoad('@n')).toBeUndefined()

    expect(runtime.handleResolveId('@m')).toMatchSnapshot()
    expect(runtime.handleResolveId('@u')).toMatchSnapshot()
    expect(runtime.handleResolveId('@n')).toBeUndefined()
  })

  it('should work with handleTransform()', () => {
    runtime.addExports(
      mockExports({
        macros: {
          '@m': [
            mockMacro('m', ({ path }) => {
              path.remove()
            }),
          ],
        },
      })
    )
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
    runtime.addExports(
      mockExports({
        types: {
          '@t': {
            moduleScope: ['type A = string'],
            macroScope: [],
          },
        },
      })
    )

    expect(runtime.typeRenderer.render()).toMatchSnapshot()

    runtime.addExports(
      mockExports({
        types: {
          '@n': {
            moduleScope: ['type B = string'],
            macroScope: [`export function a(): void`],
          },
        },
      })
    )

    // update after register new
    expect(runtime.typeRenderer.render()).toMatchSnapshot()

    const update = runtime.typeRenderer.append('@l', 'type C = string')
    expect(runtime.typeRenderer.render()).toMatchSnapshot()
    update('type G = number')
    expect(runtime.typeRenderer.render()).toMatchSnapshot()
  })

  it('should exclude specific files', () => {
    const runtime = mockRuntime(
      {
        filter: { exclude: [/node_modules/, '**/spec-scope/**/*'] },
      },
      mockExports({
        macros: {
          '@macro': [mockMacro('test', ({ path }) => path.remove())],
        },
      })
    )
    const code = `
    import { test } from '@macro'
    test()`
    const cases: string[] = [
      'workspace/node_modules/a.ts',
      'workspace/a.ts',
      'workspace/src/a.ts',
      'workspace/src/some/a.ts',
      'workspace/src/spec-scope/a.ts',
      'workspace/src/spec-scope/internal/a.ts',
    ]
    cases.forEach((filepath) => {
      expect(runtime.handleTransform(code, filepath)).toMatchSnapshot()
    })
  })

  it('should include specific files', () => {
    const runtime = mockRuntime(
      {
        filter: { include: [/\.js$/, '**/chaos-scope/**/*'] },
      },
      mockExports({
        macros: {
          '@macro': [mockMacro('test', ({ path }) => path.remove())],
        },
      })
    )
    const code = `
    import { test } from '@macro'
    test()`
    const cases: string[] = [
      'workspace/a.ts',
      'workspace/src/a.js',
      'workspace/src/some/a.ts',
      'workspace/src/chaos-scope/a.ts',
      'workspace/src/chaos-scope/internal/a.js',
    ]
    cases.forEach((filepath) => {
      expect(runtime.handleTransform(code, filepath)).toMatchSnapshot()
    })
  })

  it('should work with default filter', () => {
    const runtime = mockRuntime(
      {},
      mockExports({
        macros: {
          '@macro': [mockMacro('test', ({ path }) => path.remove())],
        },
      })
    )
    const code = `
    import { test } from '@macro'
    test()`
    const cases: string[] = [
      'workspace/node_modules/a.ts',
      'workspace/a.ts',
      'workspace/a.jsx',
      'workspace/src/a.js',
      'workspace/src/some/a.tsx',
      'workspace/src/some/a.yaml',
    ]
    cases.forEach((filepath) => {
      expect(runtime.handleTransform(code, filepath)).toMatchSnapshot()
    })
  })

  it('should check the compatibility of macros (in Attachable)', () => {
    const runtime = mockRuntime()
    const m = mockMacro('test', ({ path }) => path.remove())
    expect(() =>
      runtime.attach({
        exports: mockExports({
          macros: { '@macros': [m] },
        }),
      })
    ).not.toThrow()
    ;(m as VersionedMacro).$__macro_version = -1
    expect(() =>
      runtime.attach({
        exports: mockExports({
          macros: { '@macros': [m] },
        }),
      })
    ).toThrow()
  })
})
