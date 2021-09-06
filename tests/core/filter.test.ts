import { createFilter } from '@/core/filter'

describe('createFilter()', () => {
  it('should work with regexp', () => {
    const filter = createFilter(/\.jsx$/, /node_modules/)
    expect(filter('workspace/src/a.jsx')).toBe(true)
    expect(filter('workspace/src/abc/a.jsx')).toBe(true)
    expect(filter('workspace/src/a.js')).toBe(false)
    expect(filter('workspace/node_modules/a.jsx')).toBe(false)
    expect(filter('workspace/node_modules/a.js')).toBe(false)
  })

  it('should work with glob', () => {
    const filter = createFilter(['**/*.{tsx,ts}'], '**/node_modules')
    expect(filter('workspace/src/a.tsx')).toBe(true)
    expect(filter('workspace/src/abc/a.tsx')).toBe(true)
    expect(filter('workspace/src/a.ts')).toBe(true)
    expect(filter('workspace/node_modules/a.jsx')).toBe(false)
    expect(filter('workspace/node_modules/a.js')).toBe(false)
  })

  it('should work with no rules', () => {
    const filter = createFilter()
    expect(filter('workspace/src/a.tsx')).toBe(true)
    expect(filter('workspace/src/abc/a.tsx')).toBe(true)
    expect(filter('workspace/src/a.ts')).toBe(true)
    expect(filter('workspace/node_modules/a.jsx')).toBe(true)
    expect(filter('workspace/node_modules/a.js')).toBe(true)
  })
})
