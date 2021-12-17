import { defineMacroProvider, isMacroProvider } from '../src'

describe('function defineMacroProvider()', () => {
  it('should work', () => {
    // currently defineMacroProvider() is just an entry for macroProvider()
    const createdWithLiteral = defineMacroProvider({
      id: 'test',
      exports: {},
    })
    const createdWithFactory = defineMacroProvider(() => {
      return { id: 'test', exports: {} }
    })
    expect(createdWithFactory).toMatchSnapshot()
    expect(createdWithLiteral).toMatchSnapshot()
  })
})

describe('function isMacroProvider()', () => {
  it('should work', () => {
    const createdWithLiteral = defineMacroProvider({
      id: 'test',
      exports: {},
    })
    const createdWithFactory = defineMacroProvider(() => {
      return { id: 'test', exports: {} }
    })
    expect(isMacroProvider(createdWithFactory)).toBe(true)
    expect(isMacroProvider(createdWithLiteral)).toBe(true)
  })
})
