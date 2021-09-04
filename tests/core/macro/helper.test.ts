import { createHelper, MacroHelper } from '@/core/macro/helper'
import { getAST } from '../../testutils'
import { findImportedMacros, findProgramPath } from '@/core/helper/traverse'
import { NodePath } from '@babel/traverse'
import { CallExpression, ExpressionStatement } from '@babel/types'

describe('MacroHelper', () => {
  let helper: MacroHelper
  beforeEach(() => {
    const ast = getAST(`
  import { c } from 'c'
  import { a } from '@a'
  a(a(), c())`)
    const program = findProgramPath(ast)
    const importedMacros = findImportedMacros(ast, {
      '@a': [{ name: 'a' } as any],
    })
    const path = (program.get('body')[2] as NodePath<ExpressionStatement>).get(
      'expression'
    ) as NodePath<CallExpression>
    helper = createHelper(
      path,
      program,
      '/workspace/src/main.ts',
      importedMacros
    )
  })

  it('findImported()', () => {
    expect(
      helper.findImported({ moduleName: 'c', exportName: 'c' })
    ).not.toBeUndefined()
    expect(
      helper.findImported({ moduleName: 'c', exportName: 'd' })
    ).toBeUndefined()
  })

  it('hasImported()', () => {
    expect(helper.hasImported({ moduleName: 'c', exportName: 'c' })).toBe(true)
    expect(helper.hasImported({ moduleName: 'c', exportName: 'd' })).toBe(false)
  })

  it('prependImports()', () => {
    expect(helper.prependImports([])).toBeUndefined()
    const inserted = helper.prependImports({
      moduleName: 'c',
      exportName: 'd',
    })
    expect(inserted).toBe(
      helper.findImported({ moduleName: 'c', exportName: 'd' })
    )
  })

  it('appendImports()', () => {
    expect(helper.appendImports([])).toBeUndefined()
    const inserted = helper.appendImports({
      moduleName: 'c',
      exportName: 'd',
    })
    expect(inserted).toBe(
      helper.findImported({ moduleName: 'c', exportName: 'd' })
    )
  })

  it('normalizePathPattern()', () => {
    const { normalized } = helper.normalizePathPattern(
      '../another',
      '/workspace/src'
    )
    expect(normalized).toBe('another')
  })

  it('containsMacros()', () => {
    expect(helper.containsMacros()).toEqual([true, false])
  })
})
