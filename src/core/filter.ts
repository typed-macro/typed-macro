import { posix, win32 } from 'path'
import pm from 'picomatch'

export type FilterPattern = RegExp | string | (RegExp | string)[]

export function createFilter(include?: FilterPattern, exclude?: FilterPattern) {
  const getMatcher = (pattern: string | RegExp) => {
    if (pattern instanceof RegExp) return pattern
    const fn = pm(pattern, { dot: true })
    return { test: (id: string) => fn(id) }
  }
  const ensureArray = (v: unknown) => (v ? (Array.isArray(v) ? v : [v]) : [])

  const includeMatchers = ensureArray(include).map(getMatcher)
  const excludeMatchers = ensureArray(exclude).map(getMatcher)

  return (id: string) => {
    const pathId = id.split(win32.sep).join(posix.sep)
    for (let i = 0; i < excludeMatchers.length; ++i) {
      if (excludeMatchers[i].test(pathId)) return false
    }

    for (let i = 0; i < includeMatchers.length; ++i) {
      if (includeMatchers[i].test(pathId)) return true
    }

    return !includeMatchers.length
  }
}
