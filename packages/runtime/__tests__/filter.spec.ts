import { createFilter } from '../src'

describe('Filter', () => {
  it('should work with regexp', () => {
    const filter = createFilter({
      include: /\.jsx$/,
      exclude: /node_modules/,
    })
    expect(filter.isIncluded('workspace/src/a.js')).toBe(false)
    expect(filter.isIncluded('workspace/src/abc/a.jsx')).toBe(true)
    expect(filter.isExcluded('workspace/node_modules/a.jsx')).toBe(true)
    expect(filter.isExcluded('workspace/node_modules/a.js')).toBe(true)
  })

  it('should work with glob', () => {
    const filter = createFilter({
      include: ['**/*.mjs'],
      exclude: '**/node_modules/*',
    })
    expect(filter.isIncluded('workspace/src/a.js')).toBe(false)
    expect(filter.isIncluded('workspace/src/abc/a.mjs')).toBe(true)
    expect(filter.isExcluded('workspace/node_modules/a.jsx')).toBe(true)
    expect(filter.isExcluded('workspace/node_modules/a.mjs')).toBe(true)
  })

  it('should work with default rules', () => {
    const filter = createFilter({})
    expect(filter.isIncluded('workspace/src/a.md')).toBe(false)
    expect(filter.isIncluded('workspace/src/a.js')).toBe(true)
    expect(filter.isIncluded('workspace/src/abc/a.tsx')).toBe(true)
    expect(filter.isExcluded('workspace/node_modules/a.jsx')).toBe(true)
    expect(filter.isExcluded('workspace/node_modules/a.js')).toBe(true)
  })

  it('should work with default rules', () => {
    const filter = createFilter({})
    expect(filter.isIncluded('workspace/src/a.md')).toBe(false)
    expect(filter.isIncluded('workspace/src/a.js')).toBe(true)
    expect(filter.isIncluded('workspace/src/abc/a.tsx')).toBe(true)
    expect(filter.isExcluded('workspace/node_modules/a.jsx')).toBe(true)
    expect(filter.isExcluded('workspace/node_modules/a.js')).toBe(true)
  })
})
