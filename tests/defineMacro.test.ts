import { defineMacro } from '@/defineMacro'
import { NO_OP } from './testutils'

describe('defineMacro', () => {
  it('should work', () => {
    expect(() =>
      expect(
        defineMacro('test')
          .withCustomType('type A = string')
          .withSignature('(): void', 'NO_OP')
          .withHandler(NO_OP)
      ).toMatchSnapshot()
    ).not.toThrow()
  })

  it('should throw error if no signature provided', () => {
    expect(() => (defineMacro('test') as any).withHandler(NO_OP)).toThrow()
  })

  it('should throw error if bad name provided', () => {
    expect(() =>
      defineMacro('1a').withSignature('').withHandler(NO_OP)
    ).toThrow()
  })
})
