import { createMacroManager } from '@/createMacroManager'

describe('createMacroManager', () => {
  // keep test simple since createMacroManager is just a wrapper of macroManager
  it('should work', () => {
    expect(() =>
      createMacroManager({
        name: '',
        maxRecursions: 5,
        parserPlugins: [],
        typesPath: '',
      })
    ).not.toThrow()
  })
})
