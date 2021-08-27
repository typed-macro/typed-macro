import { isMacro, macro, renderMetaType } from '@/core/macro'
import { NO_OP } from '../testutils'

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

describe('macro() & isMacro()', () => {
  it('should work', () => {
    const cases: {
      o: any
      result: boolean
    }[] = [
      // a macro must have non-empty types
      {
        o: macro(
          'test',
          {
            signatures: [],
            types: [],
          },
          NO_OP
        ),
        result: false,
      },
      {
        o: macro(
          'test',
          {
            signatures: [
              {
                signature: '_',
              },
            ],
            types: [],
          },
          NO_OP
        ),
        result: true,
      },
    ]
    cases.forEach((c) => {
      expect(isMacro(c.o)).toBe(c.result)
    })
  })
})
