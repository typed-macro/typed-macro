import { posix, win32 } from 'path'
import pm from 'picomatch'

export type FilterPattern = RegExp | string | Array<RegExp | string>

export type FilterOptions = {
  /**
   * Regexp or glob patterns to include matches, applied after
   * {@link FilterOptions.exclude}.
   *
   * The default value is `/\.[jt]sx?$/`.
   *
   * Once this option is defined, the default one will be overwritten.
   */
  include?: FilterPattern
  /**
   * Regexp or glob patterns to exclude matches, applied before
   * {@link FilterOptions.include}.
   *
   * The default value is `/node_modules/`.
   *
   * Once this option is defined, the default one will be overwritten.
   */
  exclude?: FilterPattern
}

export function createFilter({
  include = /\.[jt]sx?$/,
  exclude = /node_modules/,
}: FilterOptions) {
  const getMatcher = (pattern: string | RegExp) => {
    if (pattern instanceof RegExp) return pattern
    const fn = pm(pattern, { dot: true })
    return { test: (id: string) => fn(id) }
  }
  const ensureArray = (v: unknown) => (v ? (Array.isArray(v) ? v : [v]) : [])

  const includeMatchers = ensureArray(include).map(getMatcher)
  const hasIncludeRule = includeMatchers.length > 0
  const excludeMatchers = ensureArray(exclude).map(getMatcher)

  return (id: string) => {
    const pathId = id.split(win32.sep).join(posix.sep)
    for (let i = 0; i < excludeMatchers.length; ++i) {
      if (excludeMatchers[i].test(pathId)) return false
    }

    for (let i = 0; i < includeMatchers.length; ++i) {
      if (includeMatchers[i].test(pathId)) return true
    }

    return !hasIncludeRule
  }
}
