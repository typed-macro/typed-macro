import { createTestTransformer, TestTransformer } from '@/tester'
import { mockMacro } from '#/testutils'

describe('transform', () => {
  let transform: TestTransformer
  beforeEach(() => {
    transform = createTestTransformer({
      maxRecursions: 1,
    })
  })
  it('should not expand local-defined functions with the same name as macros', () => {
    const macro = {
      '@macro': [mockMacro('test', ({ path }) => path.remove())],
    }
    const cases: string[] = [
      `
    import { test } from '@macro'
    test()
    {
      const test = () => {}
      test()
    } 
    `,
      `
    import macro from '@macro'
    macro.test()
    {
      const macro = {}
      macro.test()
    } 
    `,
      `
    import console from '@macro'
    console.test()
    {
      const console = window.console
      console.log()
    } 
    `,
    ]
    cases.forEach((code) => {
      expect(transform(code, macro)).toMatchSnapshot()
    })
  })
})
