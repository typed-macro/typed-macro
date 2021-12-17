import { createTestEnvContext, createTestTransformer } from '../src'
import { createMacroRemoveOnProd } from '../../core/__tests__/macros'

describe('TestTransformer', () => {
  it('should work', () => {
    const transform = createTestTransformer({
      macros: {
        '@macros': [createMacroRemoveOnProd()],
      },
    })

    const code = `
    import { dev } from '@macros'
    let a = 0
    dev(a)
    `

    const inProd = transform({
      code,
      env: createTestEnvContext({ dev: false }),
    })
    const inDev = transform(code)

    expect(inProd).not.toBe(inDev)
    expect(inProd).toMatchSnapshot()
    expect(inDev).toMatchSnapshot()
  })
})
