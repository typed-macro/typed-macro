import { assertNoDuplicatedNamespace, Runtime } from '@/core/runtime'
import { NO_OP } from '../testutils'

describe('assertNoDuplicatedNamespace()', () => {
  it('should work', () => {
    expect(() => assertNoDuplicatedNamespace(['a'], ['b'])).not.toThrow()
    expect(() => assertNoDuplicatedNamespace(['a', 'b'], ['c', 'b'])).toThrow()
  })
})

describe('Runtime', () => {
  let runtime: Runtime
  beforeEach(() => {
    runtime = new Runtime({
      transformer: {},
      typeRenderer: {
        typesPath: '',
      },
    })
  })

  it('should work with setDevMode()', () => {
    runtime.setDevMode()
    expect((runtime as any).devMode).toBe(true)
  })

  it('should work with register() and .exports', () => {
    runtime.register({
      macros: { '@m1': [{ name: 'm', apply: NO_OP }] },
      modules: { '@u1': 'export const a = 1' },
      types: {},
    })
    expect(runtime.exports).toMatchSnapshot()
    runtime.register({
      macros: { '@m2': [{ name: 'm', apply: NO_OP }] },
      modules: { '@u2': 'export const a = 1' },
      types: {},
    })
    expect(runtime.exports).toMatchSnapshot()
    expect(() => {
      runtime.register({
        macros: { '@m2': [] },
        modules: {},
        types: {},
      })
    }).toThrow()
    expect(() => {
      runtime.register({
        macros: {
          '@m3': [
            { name: 'm', apply: NO_OP },
            { name: 'm', apply: NO_OP },
          ],
        },
        modules: {},
        types: {},
      })
    }).toThrow()
  })

  it('should work with handleLoad/handleResolveId()', () => {
    runtime.register({
      macros: { '@m': [{ name: 'm', apply: NO_OP }] },
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
    runtime.register({
      macros: {
        '@m': [
          {
            name: 'm',
            apply: ({ path }) => {
              path.remove()
            },
          },
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
        'a'
      )
    ).toMatchSnapshot()
  })

  it('should work with typeRenderer()', () => {
    runtime.register({
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

    runtime.register({
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
