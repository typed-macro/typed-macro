import { isGeneratorFunction } from '@typed-macro/shared'
import { defineMacro, MacroBuilder, isMacro } from '../src'
import { createMacroRemove } from './macros'

describe('function defineMacro()', () => {
  it('should work', () => {
    const m = defineMacro('macro')
      .withCustomType('export type A = string')
      .withCustomType('export type B = number')
      .withSignature('(): void')
      .withHandler(({ path }) => {
        path.remove()
      })

    expect(m).toMatchSnapshot()
    expect(isGeneratorFunction(m.handler)).toBe(true)
  })

  it('should reject invalid macro name', () => {
    expect(() => defineMacro('ma cro ')).toThrowError()
  })

  it('should reject empty signature', () => {
    expect(() => defineMacro('macro').withSignature('')).toThrowError()
  })

  it('should reject no signature', () => {
    // when users use javascript
    expect(() =>
      (defineMacro('macro') as any as MacroBuilder).withHandler(({ path }) =>
        path.remove()
      )
    ).toThrowError()
  })

  it('should reject invalid handlers', () => {
    /* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */
    const invalidHandlers = [
      '', // not a function
      () => {}, // empty function
      async (_: any) => {}, // async function
      async function* (_: any) {}, // async generator function
    ]
    /* eslint-enable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */
    invalidHandlers.forEach((h) => {
      expect(() =>
        defineMacro('macro')
          .withSignature('(): void')
          .withHandler(h as any)
      ).toThrowError()
    })
  })

  it('should accept normal functions and generator functions', () => {
    /* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */
    const validHandlers = [(_: any) => {}, function* (_: any) {}]
    /* eslint-enable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */
    validHandlers.forEach((h) => {
      expect(() =>
        defineMacro('macro').withSignature('(): void').withHandler(h)
      ).not.toThrowError()
    })
  })
})

describe('function isMacro()', () => {
  it('should work', () => {
    expect(isMacro(createMacroRemove())).toBe(true)
    expect(isMacro('')).toBe(false)
    expect(isMacro({})).toBe(false)
  })
})
