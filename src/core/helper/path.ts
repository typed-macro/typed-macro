import { dirname, resolve, sep } from 'path'
import { existsSync } from 'fs'

export type PathHelper = {
  /**
   * Normalize path pattern so can resolve file paths as import paths
   * @param path relative path or path pattern
   * @param root absolute file path of the project dir, default to projectDir('leaf')
   * @param importer absolute file path of the importer, default to current module
   *
   * e.g. search files by glob pattern and then import them
   *
   * ```typescript
   * // /src/example/a.ts
   * // /src/example/b.ts
   * // in /src/another/index.ts
   * const pattern = '../example/*.ts'
   * const { normalized, base, resolveImportPath } = normalizePathPattern(pattern)
   * const importPaths = glob.sync(normalized, { cwd: base }).map(resolveImportPath)
   *
   * // importPaths = ['../example/a.ts', '../example/b.ts']
   * ```
   */
  normalizePathPattern: (
    pattern: string,
    root?: string,
    importer?: string
  ) => {
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

  /**
   * Get the directory of the root project or the nearest project.
   * @param which 'root' or 'leaf'
   */
  projectDir: (which: 'root' | 'leaf') => string
}

export function getPathHelper(filepath: string) {
  const normalizePathPattern: PathHelper['normalizePathPattern'] = (
    pattern,
    root = projectDir('leaf'),
    importer = filepath
  ) => {
    if (!pattern.startsWith('.') && !pattern.startsWith('/')) {
      throw new Error(
        `pattern must start with "." or "/" (relative to project root)`
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

  return {
    normalizePathPattern,
    projectDir,
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

  throw new Error('can not find project root')
}
