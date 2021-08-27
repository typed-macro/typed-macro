import { createMacroManager } from '@/createMacroManager'

describe('createMacroManager', () => {
  // keep test simple since createMacroManager is just a wrapper of macroManager
  it('should work', () => {
    expect(() =>
      createMacroManager({
        name: '',
        maxRecursion: 0,
        parserPlugins: [],
        typesPath: '',
      })
    ).not.toThrow()
  })
})
