import { defineMacro } from '@/defineMacro'
import { NO_OP } from './testutils'
import { defineMacroPlugin } from '@/defineMacroPlugin'

describe('defineMacroPlugin', () => {
  // since defineMacroPlugin is just a wrapper of plugin()
  // and plugin() is tested.
  it('should work', () => {
    const m = defineMacro('test')
      .withCustomType('type A = string')
      .withSignature('(): void', 'NO_OP')
      .withHandler(NO_OP)
    expect(() =>
      defineMacroPlugin({
        dtsPath: '',
        exports: { '@test': { macros: [m] } },
        name: 't',
      })
    ).not.toThrow()
    expect(() =>
      defineMacroPlugin({
        dtsPath: '',
        exports: { '@test': { macros: [m, m] } },
        name: 't',
      })
    ).toThrow()
  })
})
