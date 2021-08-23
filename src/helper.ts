import { dirname, resolve, sep } from 'path'
import { existsSync } from 'fs'
import { Helper, ImportOption } from './macro'
import traverse, { NodePath } from '@babel/traverse'
import template from '@babel/template'
import {
  isIdentifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isImportSpecifier,
  Program,
  File,
  ImportDeclaration,
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

  const hasImported: Helper['hasImported'] = (
    imp,
    program = thisProgram.node
  ) => {
    let has = false
    traverse(program, {
      Declaration(path) {
        if (!path.isImportDeclaration()) return
        if (!(path.node.source.value === imp.moduleName)) return
        if ('defaultName' in imp) {
          // import defaultName from 'moduleName'
          // import * as defaultName from 'moduleName'
          path.node.specifiers.forEach((s) => {
            if (isImportDefaultSpecifier(s) || isImportNamespaceSpecifier(s)) {
              if (s.local.name === imp.defaultName) {
                has = true
                path.stop()
              }
            }
          })
        } else if ('localName' in imp) {
          // import { exportName as localName } from 'moduleName'
          path.node.specifiers.forEach((s) => {
            if (isImportSpecifier(s)) {
              if (
                s.local.name === imp.localName &&
                isIdentifier(s.imported) &&
                s.imported.name === imp.exportName
              ) {
                has = true
                path.stop()
              }
            }
          })
        } else if ('exportName' in imp) {
          // import { exportName } from 'moduleName'
          path.node.specifiers.forEach((s) => {
            if (isImportSpecifier(s)) {
              if (
                isIdentifier(s.imported) &&
                s.imported.name === imp.exportName
              ) {
                has = true
                path.stop()
              }
            }
          })
        } else {
          // import 'moduleName'
          has = true
          path.stop()
        }
      },
    })
    return has
  }

  function normalizeImports(
    imports: ImportOption | ImportOption[],
    program: NodePath<Program>
  ) {
    if (!Array.isArray(imports)) imports = [imports]
    return template.statements.ast(
      imports
        .filter((imp) => !hasImported(imp, program.node))
        .map((imp) => generateImportStmt(imp))
        .join('; ')
    )
  }

  const prependImports: Helper['prependImports'] = (
    imports,
    program = thisProgram
  ) => {
    const importStmts = normalizeImports(imports, program)
    const firstImport = (program.get('body') as NodePath[]).filter((p) =>
      p.isImportDeclaration()
    )[0]
    return (
      firstImport
        ? firstImport.insertBefore(importStmts)
        : program.unshiftContainer('body', importStmts)
    ).pop() as NodePath<ImportDeclaration>
  }

  const appendImports: Helper['appendImports'] = (
    imports,
    program = thisProgram
  ) => {
    const importStmts = normalizeImports(imports, program)
    const lastImport = (program.get('body') as NodePath[])
      .filter((p) => p.isImportDeclaration())
      .pop()
    return (
      lastImport
        ? lastImport.insertAfter(importStmts)
        : program.unshiftContainer('body', importStmts)
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
    hasImported,
    prependImports,
    appendImports,
    prependToBody,
    appendToBody,
    getProgram,
  }
}
