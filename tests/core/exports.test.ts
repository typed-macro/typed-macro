import { assertNoConflictMacro, normalizeExports } from '@/core/exports'
import { macroSerializer, mockMacro } from '../testutils'
expect.addSnapshotSerializer(macroSerializer)

describe('normalizeExports()', () => {
  it('should work', () => {
    expect(
      normalizeExports({
        '@macros': {
          macros: [
            mockMacro('macro', undefined, {
              types: [],
              signatures: [{ signature: `(): void` }],
            }),
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
            function macro() {
              console.log(1)
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
        '@macros': [mockMacro('macro')],
        '@another': [mockMacro('macro')],
      })
    ).not.toThrow()
    expect(() =>
      assertNoConflictMacro({
        '@macros': [mockMacro('macro'), mockMacro('macro')],
      })
    ).toThrow()
  })
})
