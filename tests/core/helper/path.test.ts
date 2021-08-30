import { normalizePathPattern, projectDir } from '@/core/helper/path'

describe('projectDir()', () => {
  it('should work', () => {
    expect(projectDir('leaf')).not.toBeUndefined()
    expect(projectDir('root')).not.toBeUndefined()
    // in this project it should be equal
    expect(projectDir('leaf')).toBe(projectDir('root'))
  })
})

describe('normalizePathPattern()', () => {
  it('normalizePathPattern() should work', () => {
    {
      const { normalized, resolveImportPath } = normalizePathPattern(
        '../assets/*.css',
        '/workspace/a',
        '/workspace/a/src/test.ts'
      )
      expect(normalized).toBe('assets/*.css')
      expect(resolveImportPath('assets/hello.css')).toBe('../assets/hello.css')
    }
    {
      const { normalized, resolveImportPath } = normalizePathPattern(
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
      const { normalized, resolveImportPath } = normalizePathPattern(
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
        normalizePathPattern(
          'assets/',
          '/workspace/a',
          '/workspace/a/src/test.ts'
        )
      ).toThrow()
    }
  })
})
