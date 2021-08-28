import { getPathHelper, PathHelper } from '@/core/helper/path'

describe('PathHelper', () => {
  let helper: PathHelper

  const reset = (path = '/workspace/project-a/src/test.ts') => {
    helper = getPathHelper(path)
  }

  beforeEach(reset)

  it('projectDir() should work', () => {
    expect(helper.projectDir('leaf')).not.toBeUndefined()
    expect(helper.projectDir('root')).not.toBeUndefined()
    // in this project it should be equal
    expect(helper.projectDir('leaf')).toBe(helper.projectDir('root'))
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
    {
      // invalid pattern, so throw error
      expect(() =>
        helper.normalizePathPattern(
          'assets/',
          '/workspace/a',
          '/workspace/a/src/test.ts'
        )
      ).toThrow()
    }
  })
})
