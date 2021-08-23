import { getHelper } from '../src/helper'
import { File } from '@babel/types'
import { getAST, matchCodeSnapshot } from './testutils'
import template from '@babel/template'
import { ImportOption } from '../src'

describe('helper', () => {
  let ast: File
  let helper: ReturnType<typeof getHelper>

  beforeEach(() => {
    ast = getAST(`
  import { a as _a } from 'a'
  import na from 'a'
  import * as _na from 'a'
  import { a } from 'a'
  import 'a'
  const b = a(1)
  `)
    helper = getHelper('/workspace/project-a/src/test.ts', ast)
  })

  it('projectDir() should work', () => {
    const leaf = helper.projectDir('leaf')
    const root = helper.projectDir('root')
    expect(leaf).not.toBeUndefined()
    expect(root).not.toBeUndefined()
    // in this project it should be equal
    expect(leaf).toBe(root)
  })

  it('getProgram() should work', () => {
    expect(helper.getProgram()).not.toBeUndefined()
  })

  it('findImported() should work', () => {
    const imps: ImportOption[] = [
      { moduleName: 'a', exportName: 'a' },
      { moduleName: 'a', exportName: 'a', localName: '_a' },
      { moduleName: 'a' },
      { moduleName: 'a', defaultName: 'na' },
      { moduleName: 'a', namespaceName: '_na' },
    ]
    imps.forEach((item) =>
      expect(helper.findImported(item)).not.toBeUndefined()
    )
    expect(
      helper.findImported({ moduleName: 'a', exportName: 'b' })
    ).toBeUndefined()
  })

  it('hasImported() should work', () => {
    expect(helper.hasImported({ moduleName: 'a', exportName: 'a' })).toBe(true)
    expect(helper.hasImported({ moduleName: 'a', exportName: 'b' })).toBe(false)
  })

  it('prependImports() should work', () => {
    expect(helper.prependImports({ moduleName: 'a', exportName: 'a' })).toBe(
      helper.findImported({ moduleName: 'a', exportName: 'a' })
    )
    expect(
      helper.prependImports({
        moduleName: 'a',
        exportName: 'b',
      })
    ).not.toBeUndefined()
    matchCodeSnapshot(ast)
  })

  it('appendImports() should work', () => {
    expect(helper.appendImports({ moduleName: 'a', exportName: 'a' })).toBe(
      helper.findImported({ moduleName: 'a', exportName: 'a' })
    )
    expect(
      helper.appendImports({
        moduleName: 'a',
        exportName: 'b',
      })
    ).not.toBeUndefined()
    matchCodeSnapshot(ast)
  })

  it('prependToBody() should work', () => {
    helper.prependToBody(template.statement.ast(`console.log('hello world')`))
    matchCodeSnapshot(ast)
  })

  it('appendToBody() should work', () => {
    helper.appendToBody(template.statement.ast(`console.log('hello world')`))
    matchCodeSnapshot(ast)
  })

  it('normalizePathPattern() should work', () => {
    const { normalized, resolveImportPath } = helper.normalizePathPattern(
      '../assets/*.css',
      '/workspace/a',
      '/workspace/a/src/test.ts'
    )
    expect(normalized).toBe('assets/*.css')
    expect(resolveImportPath('assets/hello.css')).toBe('../assets/hello.css')
  })
})
