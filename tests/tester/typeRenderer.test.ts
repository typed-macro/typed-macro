import { createTestTypeRenderer } from '@/tester/typeRenderer'
import { defineMacro } from '@/defineMacro'

describe('createTypeRenderer()', () => {
  it('should work', () => {
    const render = createTestTypeRenderer()

    const echoMacro = defineMacro('echo')
      .withSignature('(): void')
      .withHandler(({ path }) => {
        path.remove()
      })

    expect(
      render({
        '@macro': {
          macros: [echoMacro],
        },
        '@helper': {
          code: `export const a = 1`,
          customTypes: `export const a: number`,
        },
      })
    ).toMatchSnapshot()
  })
})
