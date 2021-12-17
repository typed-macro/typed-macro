import pm from 'picomatch'
import { isArray, normalizePath } from '@typed-macro/shared'

export type Filter = {
  /**
   * Check if is included.
   */
  isIncluded(id: string): boolean
  /**
   * Check if is excluded.
   */
  isExcluded(id: string): boolean
}

export type FilterPattern = RegExp | string | Array<RegExp | string>

export type FilterOptions = {
  /**
   * Regexp or glob patterns to include matches, applied after
   * {@link FilterOptions.exclude}.
   *
   * Once this option is defined, the default one will be overwritten.
   *
   * @default /\.[jt]sx?$/
   */
  include?: FilterPattern
  /**
   * Regexp or glob patterns to exclude matches, applied before
   * {@link FilterOptions.include}.
   *
   * Once this option is defined, the default one will be overwritten.
   *
   * @default /node_modules/
   */
  exclude?: FilterPattern
}

export function createFilter({
  include = /\.[jt]sx?$/,
  exclude = /node_modules/,
}: FilterOptions): Filter {
  const getMatcher = (pattern: string | RegExp) => {
    if (pattern instanceof RegExp) return pattern
    const fn = pm(pattern, { dot: true })
    return { test: (id: string) => fn(id) }
  }
  const ensureArray = (v: unknown) => (v ? (isArray(v) ? v : [v]) : [])

  const includeMatchers = ensureArray(include).map(getMatcher)
  const excludeMatchers = ensureArray(exclude).map(getMatcher)

  return {
    isExcluded(id) {
      const path = normalizePath(id)
      return !!excludeMatchers.find((pattern) => pattern.test(path))
    },
    isIncluded(id) {
      const path = normalizePath(id)
      return !!includeMatchers.find((pattern) => pattern.test(path))
    },
  }
}
