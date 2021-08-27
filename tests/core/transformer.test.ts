import { getAST, getExpression, matchCodeSnapshot, NO_OP } from '../testutils'
import { CallExpression, StringLiteral } from '@babel/types'
import {
  applyMacros,
  collectImportedMacros,
  createTransformer,
  findCalledMacro,
} from '@/core/transformer'
import { Macro } from '@/core/macro'
import { NamespacedMacros } from '@/core/exports'
import { getStateHelper } from '@/core/helper'

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

describe('findCalledMacro()', () => {
  it('should work', () => {
    const testCases: {
      code: string
      macros: Record<string, { name: string }[]>
      call: string
    }[] = [
      {
        code: `import { a } from '@a'`,
        macros: { '@a': [{ name: 'a' }] },
        call: `a()`,
      },
      {
        code: `import { a as _a } from '@a'`,
        macros: { '@a': [{ name: 'a' }] },
        call: `a()`,
      },
      {
        code: `import { a as _a } from '@a'`,
        macros: { '@a': [{ name: 'a' }] },
        call: `_a()`,
      },
      {
        code: `import a from '@a'`,
        macros: { '@a': [{ name: 'a' }] },
        call: `a()`,
      },
      {
        code: `import * as a from '@a'`,
        macros: { '@a': [{ name: 'a' }] },
        call: `a()`,
      },
      {
        code: `import * as a from '@a'`,
        macros: { '@a': [{ name: 'a' }] },
        call: `a.a()`,
      },
      {
        code: `import * as a from '@a'`,
        macros: { '@a': [{ name: 'a' }] },
        call: `a['a']()`,
      },
      {
        code: `import * as a from '@a'`,
        macros: { '@a': [{ name: 'b' }] },
        call: `a.a()`,
      },
      {
        code: `import * as a from '@a'`,
        macros: { '@a': [{ name: 'b' }] },
        call: `a['a']()`,
      },
    ]
    testCases.forEach((c) => {
      const ast = getAST(c.code)
      const importedMacros = collectImportedMacros(ast, c.macros as any)

      expect(
        findCalledMacro(
          (getExpression(c.call) as CallExpression).callee,
          importedMacros
        )
      ).toMatchSnapshot()
    })
  })
})

describe('applyMacros()', () => {
  it('should work', () => {
    const testCases: {
      code: string
      macros: Record<string, Macro[]>
    }[] = [
      {
        code: `import {a} from '@a'`,
        macros: {
          '@a': [
            {
              name: 'a',
              apply: jest.fn(),
            },
          ],
        },
      },
      {
        code: `import {a} from '@a'; a()`,
        macros: {
          '@a': [
            {
              name: 'a',
              apply: jest.fn(),
            },
          ],
        },
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
          state: getStateHelper(),
        })
      ).toMatchSnapshot()
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
          state: getStateHelper(),
        })
      ).toThrow()
    })
  })
})

describe('transformer', () => {
  it('should work', () => {
    const transform = createTransformer({
      parserPlugins: [],
      maxRecursion: 5,
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
            {
              name: 'echo',
              apply: ({ path, args }, { template }) => {
                const msg = (args[0] as StringLiteral).value
                path.replaceWith(
                  template.statement.ast`console.log("${Array.from(
                    { length: 3 },
                    () => msg
                  ).join(' ')}")`
                )
              },
            },
          ],
        }
      )
    ).toMatchSnapshot()
  })

  it('should throw errors if there is wrong in steps', () => {
    const macros: NamespacedMacros = {
      '@echo': [
        {
          name: 'echo',
          apply: ({ path, args }) => {
            if (args.length === 0) throw new Error('')
            path.remove()
          },
        },
      ],
    }
    const transformer = createTransformer({
      parserPlugins: [],
      maxRecursion: 5,
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
      maxRecursion: 5,
    })
    // recursion
    expect(() =>
      transform(
        {
          code: `import {echo} from '@echo'; echo('yeah')`,
          filepath: '',
          dev: false,
        },
        {
          '@echo': [
            {
              name: 'echo',
              apply: NO_OP,
            },
          ],
        }
      )
    ).toThrow()
  })

  it('should recollect imported macros every loop', () => {
    const fn = jest.fn()
    const transform = createTransformer({
      parserPlugins: [],
      maxRecursion: 5,
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
            {
              name: 'a',
              apply: ({ path }, { template }, { appendToBody }) => {
                appendToBody(
                  template.statements.ast(`import {b} from '@echo'; b()`)
                )
                path.remove()
              },
            },
            {
              name: 'b',
              apply: ({ path }, { template }) => {
                fn()
                path.replaceWith(
                  template.statement.ast(`console.log('hello world')`)
                )
              },
            },
          ],
        }
      )
    ).toMatchSnapshot()
    expect(fn).toBeCalled()
  })
})
