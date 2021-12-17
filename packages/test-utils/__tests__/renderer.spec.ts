import { defineMacro } from '@typed-macro/core'
import { createTestTypeRenderer } from '../src'

describe('TestTypeRenderer', () => {
  it('should work', () => {
    const m = defineMacro('test')
      .withCustomType(`export type T = string`)
      .withSignature('(v: T): void')
      .withHandler(({ path }) => path.remove())
    const renderType = createTestTypeRenderer()
    expect(
      renderType({
        '@macros': {
          macros: [m],
          types: `export type B = number`,
        },
        '@another': {
          code: `export let a = 1`,
          types: `export let a: number`,
        },
      })
    ).toMatchSnapshot()
  })
})
