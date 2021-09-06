import { isMacroProvider, macroProvider } from '@/wrappers/macroProvider'
import { mockExports } from '#/testutils'

describe('macroProvider() & isMacroProvider()', () => {
  it('should work', () => {
    expect(
      isMacroProvider(
        macroProvider({
          exports: mockExports(),
          hooks: {},
          id: 'test',
        })
      )
    ).toBe(true)
    expect(isMacroProvider(undefined)).toBe(false)
    expect(isMacroProvider(false)).toBe(false)
  })
})
