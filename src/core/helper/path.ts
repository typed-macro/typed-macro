import { dirname, resolve, sep } from 'path'
import { existsSync } from 'fs'

export type PathPatternNormalizer = {
  /**
   * Normalized path or path pattern,
   */
  normalized: string
  /**
   * Base path for the normalized path or path pattern.
   */
  base: string
  /**
   * Get import path from file path got by normalized path and base,
   * almost the opposite operation of normalization
   * @param path file path
   */
  resolveImportPath: (path: string) => string
}

export function normalizePathPattern(
  pattern: string,
  importer: string,
  root: string
): PathPatternNormalizer {
  if (!pattern.startsWith('.') && !pattern.startsWith('/')) {
    throw new Error(
      `pattern must start with '.' or '/' (relative to project root)`
    )
  }
  let base: string
  let parentDepth = 0
  const isAbsolute = pattern.startsWith('/')
  if (isAbsolute) {
    base = resolve(root)
    pattern = pattern.slice(1)
  } else {
    base = dirname(importer)
    while (pattern.startsWith('../')) {
      pattern = pattern.slice(3)
      base = resolve(base, '../')
      parentDepth++
    }
    if (pattern.startsWith('./')) {
      pattern = pattern.slice(2)
    }
  }
  return {
    normalized: pattern,
    base,
    resolveImportPath: isAbsolute
      ? (f) => `/${f}`
      : parentDepth
      ? (f) => `${'../'.repeat(parentDepth)}${f}`
      : (f) => `./${f}`,
  }
}

const projectDirCache = {
  root: '',
  leaf: '',
}

export function projectDir(which: 'root' | 'leaf') {
  if (projectDirCache[which]) return projectDirCache[which]

  const paths = (require.main?.path || process.cwd()).split(sep)

  if (which === 'root') {
    for (let i = 0; i < paths.length; i++) {
      const path = paths.slice(0, i + 1).join(sep)
      if (existsSync([path, 'node_modules'].join(sep)))
        return (projectDirCache['root'] = path)
    }
  } else {
    for (let i = paths.length; i > 0; i--) {
      const path = paths.slice(0, i).join(sep)
      if (existsSync([path, 'node_modules'].join(sep)))
        return (projectDirCache['leaf'] = path)
    }
  }

  /* istanbul ignore next */
  /* This error is for special circumstances like not in a node project,
   * and is hard and meaningless to test under this project.
   */
  throw new Error('can not find project root')
}
