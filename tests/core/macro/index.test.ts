import { isMacro, macro, renderMetaType } from '@/core/macro'
import { NO_OP, NO_OP_HANDLER } from '../../testutils'

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
        NO_OP
      )
    ).toThrow()
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

describe('Macro', () => {
  it('should throw error when incompatible with the runtime', () => {
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
        NO_OP_HANDLER
      )({ __version: -1, value: {} as any })
    ).toThrow()
  })
})
