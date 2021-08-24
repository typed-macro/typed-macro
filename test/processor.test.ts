import {
  applyMacros,
  collectImportedMacros,
  findCalledMacro,
  getProcessor,
  throwErrorIfConflict,
} from '@/processor'
import { getAST, getExpression, matchCodeSnapshot, NO_OP } from './testutils'
import { CallExpression, StringLiteral } from '@babel/types'
import { MacroWithMeta } from '@/macro'

describe('processor methods', () => {
  it('throwErrorIfConflict() should work', () => {
    expect(() =>
      throwErrorIfConflict({ '@a': [{ name: 'a' }, { name: 'b' }] as any })
    ).not.toThrow()
    expect(() =>
      throwErrorIfConflict({ '@a': [{ name: 'a' }, { name: 'a' }] as any })
    ).toThrow()
  })

  it('collectImportedMacros() should work', () => {
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
      expect(
        collectImportedMacros(getAST(c.code), c.macros as any)
      ).toMatchSnapshot()
    })
  })

  it('collectImportedMacros() should rewrite import stmts if keep=true', () => {
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

  it('collectImportedMacros() should remove import stmts if keep=false', () => {
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

  it('collectImportedMacros() should throw error if named import non-existent macro', () => {
    const testCases: {
      code: string
      macros: Record<string, { name: string }[]>
      err: boolean
    }[] = [
      { code: `import { a } from '@a'`, macros: { '@a': [] }, err: true },
      {
        code: `import { a as _a } from '@a'`,
        macros: { '@a': [] },
        err: true,
      },
      {
        code: `import a from '@a'`,
        macros: { '@a': [{ name: 'a' }] },
        err: false,
      },
      {
        code: `import * as a from '@a'`,
        macros: { '@a': [{ name: 'a' }] },
        err: false,
      },
    ]
    testCases.forEach((c) => {
      const ast = getAST(c.code)
      c.err
        ? expect(() =>
            collectImportedMacros(ast, c.macros as any, true)
          ).toThrow()
        : expect(() =>
            collectImportedMacros(ast, c.macros as any, true)
          ).not.toThrow()
    })
  })

  it('findCalledMacro() should work', () => {
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

  it('applyMacros() should work', () => {
    const testCases: {
      code: string
      macros: Record<string, MacroWithMeta[]>
    }[] = [
      {
        code: `import {a} from '@a'`,
        macros: {
          '@a': [
            {
              name: 'a',
              meta: {} as any,
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
              meta: {} as any,
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
        })
      ).toMatchSnapshot()
    })
  })

  it('applyMacros() should throw error when call non-existent macro', () => {
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
        })
      ).toThrow()
    })
  })
})

describe('processor', () => {
  it('should work', () => {
    const process = getProcessor({
      parserPlugins: [],
      maxRecursion: 5,
      macros: {
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
      },
    })

    expect(
      process(`import { echo } from '@echo'; echo('yeah')`, '', false)
    ).toMatchSnapshot()
  })

  it('should throw errors if there is wrong in steps', () => {
    {
      const process = getProcessor({
        parserPlugins: [],
        maxRecursion: 5,
        macros: {
          '@echo': [
            {
              name: 'echo',
              apply: ({ path, args }) => {
                if (args.length === 0) throw new Error('')
                path.remove()
              },
            },
          ],
        },
      })
      // args.length === 0
      expect(() =>
        process(`import { echo } from '@echo'; echo()`, '', false)
      ).toThrow()
      // import non-existent macro
      expect(() => process(`import { abc } from '@echo';`, '', false)).toThrow()
      // call non-existent macro
      expect(() =>
        process(`import echo from '@echo'; echo.abc()`, '', false)
      ).toThrow()
    }
    {
      const process = getProcessor({
        parserPlugins: [],
        maxRecursion: 5,
        macros: {
          '@echo': [
            {
              name: 'echo',
              apply: NO_OP,
            },
          ],
        },
      })
      // recursion
      expect(() =>
        process(`import {echo} from '@echo'; echo('yeah')`, '', false)
      ).toThrow()
    }
  })

  it('should support recollect imported macros', () => {
    const fn = jest.fn()
    const process = getProcessor({
      parserPlugins: [],
      maxRecursion: 5,
      macros: {
        '@echo': [
          {
            name: 'a',
            apply: (
              { path },
              { template },
              { appendToBody, forceRecollectMacros }
            ) => {
              appendToBody(
                template.statements.ast(`import {b} from '@echo'; b()`)
              )
              path.remove()
              forceRecollectMacros()
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
      },
    })

    expect(
      process(`import { a } from '@echo'; a()`, '', false)
    ).toMatchSnapshot()
    expect(fn).toBeCalled()
  })
})
