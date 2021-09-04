import { isMacroProvider, macroProvider } from '@/wrappers/macroProvider'

describe('macroProvider() & isMacroProvider()', () => {
  it('should work', () => {
    expect(
      isMacroProvider(
        macroProvider({
          exports: {
            types: {},
            modules: {},
            macros: {},
          },
          hooks: {},
          id: 'test',
        })
      )
    ).toBe(true)
    expect(isMacroProvider(undefined)).toBe(false)
    expect(isMacroProvider(false)).toBe(false)
  })
})
