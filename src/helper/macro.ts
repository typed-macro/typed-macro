import { dirname, resolve, sep } from 'path'
import { existsSync } from 'fs'
import { Node, NodePath } from '@babel/traverse'
import template from '@babel/template'
import { File, ImportDeclaration, Program } from '@babel/types'
import {
  ImportOption,
  matchImportStmt,
  renderImportStmt,
} from '@/helper/import'
import { findProgramPath } from '@/common'

export type Helper = {
  /**
   * Get the directory of the root project or the nearest project.
   * @param which 'root' or 'leaf'
   */
  projectDir: (which: 'root' | 'leaf') => string

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
   * Prepend import statements to program.
   * @param imports an import or an array of imports
   * @param program node path of the target program for prepending import statements.
   * use the one currently being handled by default.
   * @return node path of the last inserted import statement
   */
  prependImports: (
    imports: ImportOption[] | ImportOption,
    program?: NodePath<Program>
  ) => NodePath<ImportDeclaration>

  /**
   * Append import statements to the last import statement of the program.
   * @param imports an import or an array of imports
   * @param program node path of the target program for prepending import statements.
   * use the one currently being handled by default.
   * @return node path of the last inserted import statement
   */
  appendImports: (
    imports: ImportOption[] | ImportOption,
    program?: NodePath<Program>
  ) => NodePath<ImportDeclaration>

  /**
   * Find an import statement that has been in the target program already.
   * Note that findImported() will not trim extension for moduleName.
   * @param imports an import
   * @param loose match loosely, defaults to true, e.g:
   * `import { a as _a } from 'a'` will match `{ moduleName: 'a' }` and `{ moduleName: 'a', exportName: 'a' }`
   * @param program node path of the target program. use the one currently being handled by default.
   */
  findImported: (
    imports: ImportOption,
    loose?: boolean,
    program?: NodePath<Program>
  ) => NodePath<ImportDeclaration> | undefined

  /**
   * Check if an import statement has been in the target program already.
   * Note that hasImported() will not trim extension for moduleName.
   * @param imports an import
   * @param loose match loosely, defaults to true, e.g:
   * `import { a as _a } from 'a'` will match `{ moduleName: 'a' }` and `{ moduleName: 'a', exportName: 'a' }`
   * @param program node path of the target program. use the one currently being handled by default.
   */
  hasImported: (
    imports: ImportOption,
    loose?: boolean,
    program?: NodePath<Program>
  ) => boolean

  /**
   * Prepend any node to the target program.
   * @param nodes any node or an array of nodes
   * @param program node path of the target program. use the one currently being handled by default.
   * @return node path of the last inserted node
   */
  prependToBody: <Nodes extends Node | readonly Node[]>(
    nodes: Nodes,
    program?: NodePath<Program>
  ) => NodePath

  /**
   * Append any node to the target program.
   * @param nodes any node or an array of nodes
   * @param program node path of the target program. use the one currently being handled by default.
   * @return node path of the last inserted node
   */
  appendToBody: <Nodes extends Node | readonly Node[]>(
    nodes: Nodes,
    program?: NodePath<Program>
  ) => NodePath

  /**
   * Get current program or the program of provided node.
   * @param node any node path
   */
  getProgram: (node?: NodePath) => NodePath<Program>

  /**
   * Force to recollect imported macros in the next loop.
   * Usually used after importing new macros to program during expanding a macro.
   *
   * Note:
   *
   *  Only collected imported macros can be applied, because plugin only
   *  searches call expressions for collected macros. Also, external macros
   *  cannot be collected because plugin is unaware of external macros.
   */
  forceRecollectMacros: () => void
}

const projectDirCache = {
  root: '',
  leaf: '',
}

const projectDir: Helper['projectDir'] = (which) => {
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

export function getHelper(
  filepath: string,
  ast: File
): Omit<Helper, 'forceRecollectMacros'> {
  const thisProgram = findProgramPath(ast)

  const normalizePathPattern: Helper['normalizePathPattern'] = (
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

  const findImported: Helper['findImported'] = (
    imp,
    loose = true,
    program = thisProgram
  ) => {
    // An import declaration can only be used in top-level.
    for (const path of program.get('body') as NodePath[]) {
      if (!path.isImportDeclaration()) continue
      if (matchImportStmt(imp, path.node, loose)) return path
    }
  }

  const hasImported: Helper['hasImported'] = (
    imp,
    loose = true,
    program = thisProgram
  ) => {
    return findImported(imp, loose, program) !== undefined
  }

  // returns
  // - array: generated import statements
  // - path: all import statements are duplicated, returns the node path of the last one
  function normalizeImports(
    imports: ImportOption | ImportOption[],
    program: NodePath<Program>
  ) {
    if (!Array.isArray(imports)) imports = [imports]
    // remove duplicated
    const toBeImported = imports.filter(
      (imp) => !hasImported(imp, false, program)
    )
    // all import statements are duplicated, returns the node path of the last one
    if (!toBeImported.length)
      return findImported(imports[imports.length - 1], false, program)!
    return template.statements.ast(
      Array.from(
        new Set(toBeImported.map((imp) => renderImportStmt(imp)))
      ).join('; ')
    ) as ImportDeclaration[]
  }

  const prependImports: Helper['prependImports'] = (
    imports,
    program = thisProgram
  ) => {
    const toBeImported = normalizeImports(imports, program)
    if (!Array.isArray(toBeImported)) return toBeImported
    const firstImport = (program.get('body') as NodePath[]).filter((p) =>
      p.isImportDeclaration()
    )[0]
    return (
      firstImport
        ? firstImport.insertBefore(toBeImported)
        : program.unshiftContainer('body', toBeImported)
    ).pop() as NodePath<ImportDeclaration>
  }

  const appendImports: Helper['appendImports'] = (
    imports,
    program = thisProgram
  ) => {
    const toBeImported = normalizeImports(imports, program)
    if (!Array.isArray(toBeImported)) return toBeImported
    const lastImport = (program.get('body') as NodePath[])
      .filter((p) => p.isImportDeclaration())
      .pop()
    return (
      lastImport
        ? lastImport.insertAfter(toBeImported)
        : program.unshiftContainer('body', toBeImported)
    ).pop() as NodePath<ImportDeclaration>
  }

  const prependToBody: Helper['prependToBody'] = (
    nodes,
    program = thisProgram
  ) => {
    return program.unshiftContainer('body', nodes).pop() as NodePath
  }

  const appendToBody: Helper['appendToBody'] = (
    nodes,
    program = thisProgram
  ) => {
    return program.pushContainer('body', nodes).pop() as NodePath
  }

  const getProgram: Helper['getProgram'] = (node) => {
    if (!node) return thisProgram
    return node.findParent((p) => p.isProgram()) as NodePath<Program>
  }

  return {
    projectDir,
    normalizePathPattern,
    findImported,
    hasImported,
    prependImports,
    appendImports,
    prependToBody,
    appendToBody,
    getProgram,
  }
}
