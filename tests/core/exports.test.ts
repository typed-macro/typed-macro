import { assertNoConflictMacro, normalizeExports } from '@/core/exports'
import { Macro } from '@/core/macro'
import { NO_OP } from '../testutils'

describe('normalizeExports()', () => {
  it('should work', () => {
    expect(
      normalizeExports({
        '@macros': {
          macros: [
            {
              name: 'macro',
              apply: () => {
                console.log(1)
              },
              __types: 'export function macro()',
            } as Macro,
          ],
          customTypes: 'type A = string',
        },
        '@module': {
          code: `export const a = 1`,
          customTypes: 'export const a:number',
        },
      })
    ).toMatchSnapshot()
  })

  it('should throw error if has invalid macro', () => {
    expect(() => {
      normalizeExports({
        '@macros': {
          macros: [
            {
              name: 'macro',
              apply: () => {
                console.log(1)
              },
            },
          ],
          customTypes: 'type A = string',
        },
        '@module': {
          code: `export const a = 1`,
          customTypes: 'export const a:number',
        },
      })
    }).toThrow()
  })
})

describe('assertNoConflictMacro()', () => {
  it('should work', () => {
    expect(() =>
      assertNoConflictMacro({
        '@macros': [
          {
            name: 'macro',
            apply: NO_OP,
          },
        ],
        '@another': [
          {
            name: 'macro',
            apply: NO_OP,
          },
        ],
      })
    ).not.toThrow()
    expect(() =>
      assertNoConflictMacro({
        '@macros': [
          {
            name: 'macro',
            apply: NO_OP,
          },
          {
            name: 'macro',
            apply: NO_OP,
          },
        ],
      })
    ).toThrow()
  })
})
