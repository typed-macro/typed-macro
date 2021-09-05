import { parse } from '@babel/parser'
import {
  containsMacros,
  findImported,
  findImportedMacros,
  findProgramPath,
  getCalledMacro,
} from '@/core/helper/traverse'
import template from '@babel/template'
import { ImportOption } from '@/core/helper/import'
import {
  CallExpression,
  ExpressionStatement,
  File,
  Program,
} from '@babel/types'
import { NodePath } from '@babel/traverse'
import { getAST, getPath, matchCodeSnapshot } from '../../testutils'

let ast: File
let program: NodePath<Program>

const reset = (code = `const z = 1`) => {
  ast = getAST(code)
  program = findProgramPath(ast)
}

beforeEach(reset)

describe('findProgramPath()', () => {
  it('should work', () => {
    const ast = parse(`const a = 1`)
    const program = findProgramPath(ast)
    expect(program).not.toBeNull()
    expect(program).not.toBeUndefined()
  })

  it('should be synchronized when changed', () => {
    const ast = parse(`const a = 1`)
    const programA = findProgramPath(ast)
    const programB = findProgramPath(ast)
    programA.unshiftContainer('body', template.statement.ast('const b = 2'))
    expect(programA.get('body').length).toBe(2)
    expect(programB.get('body').length).toBe(2)
  })
})

describe('findImported()', () => {
  it('should return found node path', () => {
    reset(`
  import { a as _a } from 'a'
  import na from 'a'
  import * as _na from 'a'
  import { a } from 'a'
  import 'a'`)
    const imps: ImportOption[] = [
      { moduleName: 'a', exportName: 'a' },
      { moduleName: 'a', exportName: 'a', localName: '_a' },
      { moduleName: 'a' },
      { moduleName: 'a', defaultName: 'na' },
      { moduleName: 'a', namespaceName: '_na' },
    ]
    imps.forEach((item) =>
      expect(findImported(program, item)).not.toBeUndefined()
    )
    expect(
      findImported(program, { moduleName: 'a', exportName: 'b' })
    ).toBeUndefined()
  })

  it('should work with loose=true', () => {
    {
      reset(`import { a } from 'a'`)
      expect(
        findImported(program, { moduleName: 'a', exportName: 'a' }, true)
      ).not.toBeUndefined()
      expect(
        findImported(program, { moduleName: 'a' }, true)
      ).not.toBeUndefined()
    }
    {
      reset(`import { a as _a } from 'a'`)
      expect(
        findImported(
          program,
          {
            moduleName: 'a',
            exportName: 'a',
            localName: '_a',
          },
          true
        )
      ).not.toBeUndefined()
      expect(
        findImported(program, { moduleName: 'a', exportName: 'a' }, true)
      ).not.toBeUndefined()
      expect(
        findImported(program, { moduleName: 'a' }, true)
      ).not.toBeUndefined()
      expect(
        findImported(program, { moduleName: 'a', exportName: 'b' }, true)
      ).toBeUndefined()
    }
  })

  it('should work with loose=false', () => {
    {
      reset(`import { a } from 'a'`)
      expect(
        findImported(program, { moduleName: 'a', exportName: 'a' }, false)
      ).not.toBeUndefined()
      expect(findImported(program, { moduleName: 'a' }, false)).toBeUndefined()
    }
    {
      reset(`import { a as _a } from 'a'`)
      expect(
        findImported(
          program,
          {
            moduleName: 'a',
            exportName: 'a',
            localName: '_a',
          },
          false
        )
      ).not.toBeUndefined()
      expect(
        findImported(program, { moduleName: 'a', exportName: 'a' }, false)
      ).toBeUndefined()
      expect(findImported(program, { moduleName: 'a' }, false)).toBeUndefined()
      expect(
        findImported(program, { moduleName: 'a', exportName: 'b' }, false)
      ).toBeUndefined()
    }
  })
})

describe('findImportedMacros()', () => {
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
        findImportedMacros(getAST(c.code), c.macros as any)
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
      findImportedMacros(ast, c.macros as any, true)
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
      findImportedMacros(ast, c.macros as any)
      expect(ast.program.body.length).toBe(0)
    })
  })
})

describe('getCalledMacro()', () => {
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
      const importedMacros = findImportedMacros(ast, c.macros as any)

      expect(
        getCalledMacro(
          (
            (
              getPath(c.call).get('body')[0] as NodePath<ExpressionStatement>
            ).get('expression') as NodePath<CallExpression>
          ).get('callee'),
          importedMacros
        )
      ).toMatchSnapshot()
    })
  })
})

describe('containsMacros()', () => {
  it('should work', () => {
    const ast = getAST(`
  import { a } from '@a'
  a(a(), c(), c(a()))`)
    const importedMacros = findImportedMacros(
      ast,
      {
        '@a': [{ name: 'a' } as any],
      },
      true
    )
    const program = findProgramPath(ast)
    const paths = (
      (program.get('body')[1] as NodePath<ExpressionStatement>).get(
        'expression'
      ) as NodePath<CallExpression>
    ).get('arguments')
    expect(containsMacros(paths, importedMacros)).toEqual([true, false, true])
  })
})
