import { File, Program } from '@babel/types'
import { getAST, matchCodeSnapshot } from '../../testutils'
import template from '@babel/template'
import { ImportOption } from '@/core/helper/import'
import { NodePath } from '@babel/traverse'
import { findProgramPath } from '@/core/helper/traverse'
import {
  appendImports,
  appendToBody,
  prependImports,
  prependToBody,
} from '@/core/helper/transform'

let ast: File
let program: NodePath<Program>

const reset = (code = `const z = 1`) => {
  ast = getAST(code)
  program = findProgramPath(ast)
}

beforeEach(reset)

describe('pre-/ap-pendImports()', () => {
  it('should returns undefined if empty array provided', () => {
    reset(`import { a } from 'a'`)
    expect(appendImports(program, [])).toBeUndefined()
    expect(prependImports(program, [])).toBeUndefined()
  })

  it('should returns the existed import stmt', () => {
    reset(`import { a } from 'a'`)
    expect(
      appendImports(program, { moduleName: 'a', exportName: 'a' })
    ).toMatchSnapshot()
    expect(
      prependImports(program, { moduleName: 'a', exportName: 'a' })
    ).toMatchSnapshot()
  })

  it('should insert new import stmts', () => {
    {
      reset(`const a = 1`)
      const imps: ImportOption[] = [
        { moduleName: 'b', exportName: 'b', localName: '_b' },
        { moduleName: 'b', exportName: 'b' },
        { moduleName: 'b' },
        { moduleName: 'b', defaultName: 'nb' },
        { moduleName: 'b', namespaceName: '_nb' },
      ]
      imps.forEach((item) =>
        expect(prependImports(program, item)).not.toBeUndefined()
      )
      matchCodeSnapshot(ast)
    }
    {
      reset(`const a = 1`)
      const imps: ImportOption[] = [
        { moduleName: 'b', exportName: 'b', localName: '_b' },
        { moduleName: 'b', exportName: 'b' },
        { moduleName: 'b' },
        { moduleName: 'b', defaultName: 'nb' },
        { moduleName: 'b', namespaceName: '_nb' },
      ]
      imps.forEach((item) =>
        expect(appendImports(program, item)).not.toBeUndefined()
      )
      matchCodeSnapshot(ast)
    }
  })

  it('should unshift to body if no existed import stmt', () => {
    {
      reset(`const b = 1`)
      expect(prependImports(program, { moduleName: 'a' })).not.toBeUndefined()
      matchCodeSnapshot(ast)
    }
    {
      reset(`const b = 1`)
      expect(appendImports(program, { moduleName: 'a' })).not.toBeUndefined()
      matchCodeSnapshot(ast)
    }
  })
})

describe('pre-/ap-pendToBody()', () => {
  it('should work', () => {
    {
      reset(`const b = 1`)
      prependToBody(program, template.statement.ast(`console.log('prepended')`))
      matchCodeSnapshot(ast)
    }
    {
      reset(`const b = 1`)
      appendToBody(program, template.statement.ast(`console.log('appended')`))
      matchCodeSnapshot(ast)
    }
  })
})
