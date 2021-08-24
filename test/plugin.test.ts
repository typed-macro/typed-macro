import { CustomTypes, plugin, renderTypes } from '@/plugin'
import { Plugin } from 'vite'

describe('renderTypes()', () => {
  it('should work', (done) => {
    async function test() {
      const types: CustomTypes = {
        '@test': {
          moduleScopeTypes: 'type B = string',
          macroScope: [
            {
              name: 'test',
              meta: {
                types: ['type A = string'],
                signatures: [
                  {
                    signature: '(): void',
                    comment: 'just test',
                  },
                ],
              },
            },
          ],
        },
      }
      expect(await renderTypes(types)).toMatchSnapshot()
    }
    test().then(done)
  })
})

describe('plugin()', () => {
  let _plugin: Plugin
  beforeEach(() => {
    _plugin = plugin({
      name: 'test',
      dtsPath: '',
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
      maxRecursion: 5,
      parserPlugins: [],
      customTypes: {},
      hooks: {},
    })
  })
  it('should transform with macro', () => {
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
  })
  it('should load properly', () => {
    expect(_plugin.load!.call(null as any, '@helper')).toMatchSnapshot()
    expect(_plugin.load!.call(null as any, '@echo')).toMatchSnapshot()
  })
  it('should resolve id properly', () => {
    expect(_plugin.resolveId!.call(null as any, '@helper', '', {})).toBe(
      '@helper'
    )
    expect(_plugin.resolveId!.call(null as any, '@echo', '', {})).toBe('@echo')
  })
})
