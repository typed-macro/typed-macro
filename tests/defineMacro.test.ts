import { defineMacro } from '@/defineMacro'
import { macroSerializer, NO_OP_HANDLER } from './testutils'

expect.addSnapshotSerializer(macroSerializer)

describe('defineMacro', () => {
  it('should work', () => {
    expect(() =>
      expect(
        defineMacro('test')
          .withCustomType('type A = string')
          .withSignature('(): void', 'NO_OP')
          .withHandler(NO_OP_HANDLER)
      ).toMatchSnapshot()
    ).not.toThrow()
  })

  it('should throw error if no signature provided', () => {
    expect(() =>
      (defineMacro('test') as any).withHandler(NO_OP_HANDLER)
    ).toThrow()
  })

  it('should throw error if bad name provided', () => {
    expect(() =>
      defineMacro('1a').withSignature('').withHandler(NO_OP_HANDLER)
    ).toThrow()
  })
})
