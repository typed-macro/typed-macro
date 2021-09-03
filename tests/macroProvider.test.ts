import { isMacroProvider, macroProvider } from '@/macroProvider'

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
          options: { transformer: {} },
        })
      )
    ).toBe(true)
    expect(isMacroProvider(undefined)).toBe(false)
    expect(isMacroProvider(false)).toBe(false)
  })
})
