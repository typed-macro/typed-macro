import { dirname, resolve, sep } from 'path'
import { existsSync } from 'fs'
import { Helper, ImportOption } from './macro'
import { NodePath } from '@babel/traverse'
import template from '@babel/template'
import {
  File,
  ImportDeclaration,
  isIdentifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isImportSpecifier,
  Program,
} from '@babel/types'
import { findProgramPath } from './common'

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

const generateImportStmt = (imp: ImportOption) =>
  'defaultName' in imp
    ? `import ${imp.defaultName} from '${imp.moduleName}'`
    : 'localName' in imp
    ? `import { ${imp.exportName} as ${imp.localName} } from '${imp.moduleName}'`
    : 'exportName' in imp
    ? `import { ${imp.exportName} } from '${imp.moduleName}'`
    : 'namespaceName' in imp
    ? `import * as ${imp.namespaceName} from '${imp.moduleName}'`
    : `import '${imp.moduleName}'`

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

  const findImported: Helper['findImported'] = (imp, program = thisProgram) => {
    // An import declaration can only be used in top-level.
    for (const path of program.get('body') as NodePath[]) {
      if (!path.isImportDeclaration()) continue
      if (!(path.node.source.value === imp.moduleName)) continue
      if ('defaultName' in imp) {
        // import defaultName from 'moduleName'
        for (const s of path.node.specifiers) {
          if (isImportDefaultSpecifier(s) && s.local.name === imp.defaultName)
            return path
        }
      } else if ('localName' in imp) {
        // import { exportName as localName } from 'moduleName'
        for (const s of path.node.specifiers) {
          if (
            isImportSpecifier(s) &&
            s.local.name === imp.localName &&
            isIdentifier(s.imported) &&
            s.imported.name === imp.exportName
          )
            return path
        }
      } else if ('exportName' in imp) {
        // import { exportName } from 'moduleName'
        for (const s of path.node.specifiers) {
          if (
            isImportSpecifier(s) &&
            isIdentifier(s.imported) &&
            s.imported.name === imp.exportName
          )
            return path
        }
      } else if ('namespaceName' in imp) {
        // import * as defaultName from 'moduleName'
        for (const s of path.node.specifiers) {
          if (
            isImportNamespaceSpecifier(s) &&
            s.local.name === imp.namespaceName
          )
            return path
        }
      } else {
        // import 'moduleName'
        return path
      }
    }
  }

  const hasImported: Helper['hasImported'] = (imp, program = thisProgram) => {
    return findImported(imp, program) !== undefined
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
    const toBeImported = imports.filter((imp) => !hasImported(imp, program))
    // all import statements are duplicated, returns the node path of the last one
    if (!toBeImported.length)
      return findImported(imports[imports.length - 1], program)!
    return template.statements.ast(
      Array.from(
        new Set(toBeImported.map((imp) => generateImportStmt(imp)))
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
