import { createTestTransformer } from '@/tester/transformer'
import { defineMacro } from '@/defineMacro'

describe('createTestTransformer()', () => {
  const transform = createTestTransformer()

  it('should return original code if no transformation', () => {
    // pass code string
    expect(transform(`console.log('a')`, {})).toBe(`console.log('a')`)
    // pass ctx
    expect(transform({ code: `console.log('a')` }, {})).toBe(`console.log('a')`)
  })

  it('should work', () => {
    const echoMacro = defineMacro('echo')
      .withSignature('')
      .withHandler(({ path }, { template }) => {
        path.replaceWith(template.expression.ast(`console.log('a')`))
      })

    const macros = {
      '@macro': [echoMacro],
    }

    expect(
      transform(`import { echo } from '@macro'; echo()`, macros)
    ).toMatchSnapshot()
    expect(
      transform(
        { code: `import { echo } from '@macro'; echo()`, dev: true },
        macros
      )
    ).toMatchSnapshot()
  })
})
