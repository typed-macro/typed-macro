import { HELPER } from '@/core/macro/helper'
import { getAST } from '../../testutils'
import { findImportedMacros, findProgramPath } from '@/core/helper/traverse'
import { NodePath } from '@babel/traverse'
import { CallExpression, ExpressionStatement } from '@babel/types'

describe('MacroHelper', () => {
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
    HELPER.props
      .setProgram(program)
      .setFilepath('/workspace/src/main.ts')
      .setImportedMacros(importedMacros)
      .setPath(path)
  })

  it('findImported()', () => {
    expect(
      HELPER.instance.findImported({ moduleName: 'c', exportName: 'c' })
    ).not.toBeUndefined()
    expect(
      HELPER.instance.findImported({ moduleName: 'c', exportName: 'd' })
    ).toBeUndefined()
  })

  it('hasImported()', () => {
    expect(
      HELPER.instance.hasImported({ moduleName: 'c', exportName: 'c' })
    ).toBe(true)
    expect(
      HELPER.instance.hasImported({ moduleName: 'c', exportName: 'd' })
    ).toBe(false)
  })

  it('prependImports()', () => {
    expect(HELPER.instance.prependImports([])).toBeUndefined()
    const inserted = HELPER.instance.prependImports({
      moduleName: 'c',
      exportName: 'd',
    })
    expect(inserted).toBe(
      HELPER.instance.findImported({ moduleName: 'c', exportName: 'd' })
    )
  })

  it('appendImports()', () => {
    expect(HELPER.instance.appendImports([])).toBeUndefined()
    const inserted = HELPER.instance.appendImports({
      moduleName: 'c',
      exportName: 'd',
    })
    expect(inserted).toBe(
      HELPER.instance.findImported({ moduleName: 'c', exportName: 'd' })
    )
  })

  it('normalizePathPattern()', () => {
    const { normalized } = HELPER.instance.normalizePathPattern(
      '../another',
      '/workspace/src'
    )
    expect(normalized).toBe('another')
  })

  it('containsMacros()', () => {
    expect(HELPER.instance.containsMacros()).toEqual([true, false])
  })
})
