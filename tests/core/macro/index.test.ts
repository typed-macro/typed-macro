import { isMacro, macro, renderMetaType } from '@/core/macro'
import { ASYNC_NO_OP, NO_OP, NO_OP_HANDLER } from '#/testutils'

describe('renderMetaType()', () => {
  it('should work', () => {
    expect(
      renderMetaType('macro', {
        signatures: [
          {
            signature: `(): A`,
            comment: `hello`,
          },
        ],
        types: ['type A = string'],
      })
    ).toMatchSnapshot()
  })
})

describe('macro()', () => {
  it('should throw error if handler is invalid', () => {
    const invalidHandlers = [NO_OP, ASYNC_NO_OP]
    invalidHandlers.forEach((h) =>
      expect(() =>
        macro(
          'test',
          {
            signatures: [
              {
                signature: '_',
              },
            ],
            types: [],
          },
          // NO_OP has no parameter
          h
        )
      ).toThrow()
    )
  })
})

describe('macro() & isMacro()', () => {
  it('should work', () => {
    expect(
      isMacro(
        macro(
          'test',
          {
            signatures: [
              {
                signature: '_',
              },
            ],
            types: [],
          },
          NO_OP_HANDLER
        )
      )
    ).toBe(true)
    expect(isMacro(undefined)).toBe(false)
    expect(isMacro(false)).toBe(false)
  })
})
