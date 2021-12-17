import { createTestEnvContext, createTestRuntime } from '../src'
import { defineMacroProvider } from '@typed-macro/core'
import { createMacroRemoveOnProd } from '../../core/__tests__/macros'

describe('TestRuntime', () => {
  it('should work', async () => {
    const provider = defineMacroProvider({
      id: 'test',
      exports: { '@macros': { macros: [createMacroRemoveOnProd()] } },
    })

    const runtimeDev = createTestRuntime({
      provider,
    })
    const runtimeProd = createTestRuntime({
      provider: [provider],
      env: createTestEnvContext({ dev: false }),
    })

    const code = `
    import { dev } from '@macros'
    let a = 0
    dev(a)
    `

    const inProd = await runtimeProd.transform(code, 'test.ts')
    const inDev = await runtimeDev.transform(code, 'test.ts')

    expect(inProd).not.toBe(inDev)
    expect(inProd).toMatchSnapshot()
    expect(inDev).toMatchSnapshot()

    expect(runtimeDev.renderTypes()).toMatchSnapshot()
  })
})
