import { validateMacros, normalizeExports } from '@/core/exports'
import { macroSerializer, mockMacro } from '#/testutils'
import { VersionedMacro } from '@/core/compat'
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
          macros: [{ name: 'macro' } as any],
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

describe('validateMacros()', () => {
  it('should check name conflicts', () => {
    expect(() =>
      validateMacros({
        '@macros': [mockMacro('macro')],
        '@another': [mockMacro('macro')],
      })
    ).not.toThrow()
    expect(() =>
      validateMacros({
        '@macros': [mockMacro('macro'), mockMacro('macro')],
      })
    ).toThrow()
  })

  it('should check the compatibility of macros', () => {
    const m = mockMacro('macro')
    expect(() => validateMacros({ '@macros': [m] })).not.toThrow()
    ;(m as VersionedMacro).$__macro_version = -1
    expect(() => validateMacros({ '@macros': [m] })).toThrow()
  })
})
