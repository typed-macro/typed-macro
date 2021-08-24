import { getHelper } from '@/helper/macro'
import { File } from '@babel/types'
import { getAST, matchCodeSnapshot } from '../testutils'
import template from '@babel/template'
import { ImportOption } from '@/helper/import'

describe('tools#helper', () => {
  let ast: File
  let helper: ReturnType<typeof getHelper>

  const reset = (
    code = `const z = 1`,
    filepath = '/workspace/project-a/src/test.ts'
  ) => {
    ast = getAST(code)
    helper = getHelper(filepath, ast)
  }

  beforeEach(reset)

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

  it('findImported() should return found node path', () => {
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
      expect(helper.findImported(item)).not.toBeUndefined()
    )
    expect(
      helper.findImported({ moduleName: 'a', exportName: 'b' })
    ).toBeUndefined()
  })

  it('hasImported(loose=true) should work', () => {
    {
      reset(`import { a } from 'a'`)
      expect(helper.hasImported({ moduleName: 'a', exportName: 'a' })).toBe(
        true
      )
      expect(helper.hasImported({ moduleName: 'a' })).toBe(true)
    }
    {
      reset(`import { a as _a } from 'a'`)
      expect(
        helper.hasImported({
          moduleName: 'a',
          exportName: 'a',
          localName: '_a',
        })
      ).toBe(true)
      expect(helper.hasImported({ moduleName: 'a', exportName: 'a' })).toBe(
        true
      )
      expect(helper.hasImported({ moduleName: 'a' })).toBe(true)
    }

    expect(helper.hasImported({ moduleName: 'a', exportName: 'b' })).toBe(false)
  })

  it('hasImported(loose=false) should work', () => {
    {
      reset(`import { a } from 'a'`)
      expect(
        helper.hasImported({ moduleName: 'a', exportName: 'a' }, false)
      ).toBe(true)
      expect(helper.hasImported({ moduleName: 'a' }, false)).toBe(false)
    }
    {
      reset(`import { a as _a } from 'a'`)
      expect(
        helper.hasImported(
          {
            moduleName: 'a',
            exportName: 'a',
            localName: '_a',
          },
          false
        )
      ).toBe(true)
      expect(
        helper.hasImported({ moduleName: 'a', exportName: 'a' }, false)
      ).toBe(false)
      expect(helper.hasImported({ moduleName: 'a' }, false)).toBe(false)
    }

    expect(
      helper.hasImported({ moduleName: 'a', exportName: 'b' }, false)
    ).toBe(false)
  })

  it('pre-/ap-pendImports() should returns the existed import stmt', () => {
    reset(`import { a } from 'a'`)
    expect(helper.appendImports({ moduleName: 'a', exportName: 'a' })).toBe(
      helper.findImported({ moduleName: 'a', exportName: 'a' })
    )
    expect(helper.prependImports({ moduleName: 'a', exportName: 'a' })).toBe(
      helper.findImported({ moduleName: 'a', exportName: 'a' })
    )
  })

  it('pre-/ap-pendImports() should insert new import stmts', function () {
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
        expect(helper.prependImports(item)).not.toBeUndefined()
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
        expect(helper.appendImports(item)).not.toBeUndefined()
      )
      matchCodeSnapshot(ast)
    }
  })

  it('pre-/ap-pendImports() should unshift to body if no existed import stmt', function () {
    {
      reset(`const b = 1`)
      expect(helper.prependImports({ moduleName: 'a' })).not.toBeUndefined()
      matchCodeSnapshot(ast)
    }
    {
      reset(`const b = 1`)
      expect(helper.appendImports({ moduleName: 'a' })).not.toBeUndefined()
      matchCodeSnapshot(ast)
    }
  })

  it('pre-/ap-pendToBody() should work', () => {
    {
      reset(`const b = 1`)
      helper.prependToBody(template.statement.ast(`console.log('prepended')`))
      matchCodeSnapshot(ast)
    }
    {
      reset(`const b = 1`)
      helper.appendToBody(template.statement.ast(`console.log('appended')`))
      matchCodeSnapshot(ast)
    }
  })

  it('normalizePathPattern() should work', () => {
    {
      const { normalized, resolveImportPath } = helper.normalizePathPattern(
        '../assets/*.css',
        '/workspace/a',
        '/workspace/a/src/test.ts'
      )
      expect(normalized).toBe('assets/*.css')
      expect(resolveImportPath('assets/hello.css')).toBe('../assets/hello.css')
    }
    {
      const { normalized, resolveImportPath } = helper.normalizePathPattern(
        '/assets/*.css',
        '/workspace/a',
        '/workspace/a/src/test/test.ts'
      )
      expect(normalized).toBe('assets/*.css')
      expect(resolveImportPath('assets/hello.css')).toBe(
        // absolute
        '/assets/hello.css'
      )
    }
    {
      const { normalized, resolveImportPath } = helper.normalizePathPattern(
        './assets/*.css',
        '/workspace/a',
        '/workspace/a/src/test.ts'
      )
      expect(normalized).toBe('assets/*.css')
      expect(resolveImportPath('assets/hello.css')).toBe('./assets/hello.css')
    }
  })
})
