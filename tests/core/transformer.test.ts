import {
  getAST,
  macroSerializer,
  matchCodeSnapshot,
  mockMacro,
} from '../testutils'
import { StringLiteral } from '@babel/types'
import {
  applyMacros,
  collectImportedMacros,
  createTransformer,
} from '@/core/transformer'
import { Macro } from '@/core/macro'
import { NamespacedMacros } from '@/core/exports'
import { createState } from '@/core/helper/state'

expect.addSnapshotSerializer(macroSerializer)

describe('collectImportedMacros()', () => {
  it('should work', () => {
    const testCases: {
      code: string
      macros: Record<string, { name: string }[]>
    }[] = [
      { code: `import { a } from '@a'`, macros: { '@a': [{ name: 'a' }] } },
      {
        code: `import { a as _a } from '@a'`,
        macros: { '@a': [{ name: 'a' }] },
      },
      { code: `import a from '@a'`, macros: { '@a': [{ name: 'a' }] } },
      { code: `import * as a from '@a'`, macros: { '@a': [{ name: 'a' }] } },
      { code: `import { b } from '@b'`, macros: { '@a': [{ name: 'a' }] } },
    ]
    testCases.forEach((c) => {
      expect(
        collectImportedMacros(getAST(c.code), c.macros as any)
      ).toMatchSnapshot()
    })
  })

  it('should rewrite import stmts if keep=true', () => {
    const testCases: {
      code: string
      macros: Record<string, { name: string }[]>
    }[] = [
      { code: `import { a } from '@a'`, macros: { '@a': [{ name: 'a' }] } },
      {
        code: `import { a as _a } from '@a'`,
        macros: { '@a': [{ name: 'a' }] },
      },
      { code: `import a from '@a'`, macros: { '@a': [{ name: 'a' }] } },
      { code: `import * as a from '@a'`, macros: { '@a': [{ name: 'a' }] } },
    ]
    testCases.forEach((c) => {
      const ast = getAST(c.code)
      collectImportedMacros(ast, c.macros as any, true)
      matchCodeSnapshot(ast)
    })
  })

  it('should remove import stmts if keep=false', () => {
    const testCases: {
      code: string
      macros: Record<string, { name: string }[]>
    }[] = [
      { code: `import { a } from '@a'`, macros: { '@a': [{ name: 'a' }] } },
      {
        code: `import { a as _a } from '@a'`,
        macros: { '@a': [{ name: 'a' }] },
      },
      { code: `import a from '@a'`, macros: { '@a': [{ name: 'a' }] } },
      { code: `import * as a from '@a'`, macros: { '@a': [{ name: 'a' }] } },
    ]
    testCases.forEach((c) => {
      const ast = getAST(c.code)
      collectImportedMacros(ast, c.macros as any)
      expect(ast.program.body.length).toBe(0)
    })
  })
})

describe('applyMacros()', () => {
  it('should work', () => {
    const testCases: {
      code: string
      macros: Record<string, Macro[]>
      applied: boolean
    }[] = [
      {
        code: `import {a} from '@a'`,
        macros: {
          '@a': [mockMacro('a')],
        },
        applied: false,
      },
      {
        code: `import {a} from '@a'; a()`,
        macros: {
          '@a': [mockMacro('a')],
        },
        applied: true,
      },
    ]
    testCases.forEach((c) => {
      const ast = getAST(c.code)
      const importedMacros = collectImportedMacros(ast, c.macros)

      expect(
        applyMacros({
          code: c.code,
          filepath: '',
          ast,
          importedMacros,
          ssr: false,
          transformState: createState(),
        })
      ).toBe(c.applied)
    })
  })

  it('should throw error when call non-existent macro', () => {
    const testCases: {
      code: string
      macros: Record<string, { name: string }[]>
    }[] = [
      {
        code: `import a from '@a'; a.a()`,
        macros: {
          '@a': [],
        },
      },
    ]
    testCases.forEach((c) => {
      const ast = getAST(c.code)
      const importedMacros = collectImportedMacros(ast, c.macros as any)

      expect(() =>
        applyMacros({
          code: c.code,
          filepath: '',
          ast,
          importedMacros,
          ssr: false,
          transformState: createState(),
        })
      ).toThrow()
    })
  })
})

describe('transformer', () => {
  it('should work', () => {
    const transform = createTransformer({
      parserPlugins: [],
      maxRecursions: 5,
    })

    expect(
      transform(
        {
          code: `import { echo } from '@echo'; echo('yeah')`,
          filepath: '',
          dev: true,
        },
        {
          '@echo': [
            mockMacro('echo', ({ path, args }, { template }) => {
              const msg = (args[0] as StringLiteral).value
              path.replaceWith(
                template.statement.ast`console.log("${Array.from(
                  { length: 3 },
                  () => msg
                ).join(' ')}")`
              )
            }),
          ],
        }
      )
    ).toMatchSnapshot()
  })

  it('should throw errors if there is wrong in steps', () => {
    const macros: NamespacedMacros = {
      '@echo': [
        mockMacro('echo', ({ path, args }) => {
          if (args.length === 0) throw new Error('')
          path.remove()
        }),
      ],
    }
    const transformer = createTransformer({
      parserPlugins: [],
      maxRecursions: 5,
    })
    const transform = (code: string) =>
      transformer(
        {
          code,
          filepath: '',
          dev: false,
        },
        macros
      )
    // args.length === 0
    expect(() => transform(`import { echo } from '@echo'; echo()`)).toThrow()
    // import non-existent macro and call
    expect(() => transform(`import { abc } from '@echo'; abc()`)).toThrow()
    // import non-existent macro but no call
    expect(() => transform(`import { abc } from '@echo';`)).not.toThrow()
    // call non-existent macro
    expect(() => transform(`import echo from '@echo'; echo.abc()`)).toThrow()
  })

  it('should throw errors if reached max recursion', () => {
    const transform = createTransformer({
      parserPlugins: [],
      maxRecursions: 5,
    })
    // recursion
    expect(() => {
      let max = 5
      transform(
        {
          code: `import {echo} from '@echo'; echo('yeah')`,
          filepath: '',
          dev: false,
        },
        {
          '@echo': [
            mockMacro('echo', ({ path }) => {
              if (--max === 0) path.remove()
            }),
          ],
        }
      )
    }).not.toThrow()
    expect(() => {
      let max = 6
      transform(
        {
          code: `import {echo} from '@echo'; echo('yeah')`,
          filepath: '',
          dev: false,
        },
        {
          '@echo': [
            mockMacro('echo', ({ path }) => {
              if (--max === 0) path.remove()
            }),
          ],
        }
      )
    }).toThrow()
  })

  it('should recollect imported macros every loop', () => {
    const fn = jest.fn()
    const transform = createTransformer({
      parserPlugins: [],
      maxRecursions: 5,
    })

    expect(
      transform(
        {
          code: `import { a } from '@echo'; a()`,
          filepath: '',
          dev: false,
        },
        {
          '@echo': [
            mockMacro('a', ({ path }, { template }, { appendToBody }) => {
              appendToBody(
                template.statements.ast(`import {b} from '@echo'; b()`)
              )
              path.remove()
            }),
            mockMacro('b', ({ path }, { template }) => {
              fn()
              path.replaceWith(
                template.statement.ast(`console.log('hello world')`)
              )
            }),
          ],
        }
      )
    ).toMatchSnapshot()
    expect(fn).toBeCalled()
  })
})
