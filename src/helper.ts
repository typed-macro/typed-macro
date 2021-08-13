import { dirname, resolve, sep } from 'path'
import { existsSync } from 'fs'
import { Helper, Imports } from './macro'
import traverse, { NodePath } from '@babel/traverse'
import { statements } from '@babel/template'
import {
  isIdentifier,
  isImportNamespaceSpecifier,
  isImportSpecifier,
  isImportDefaultSpecifier,
  Program,
} from '@babel/types'

function getProjectDirHelper(): Helper['projectDir'] {
  const projectDirCache = {
    root: '',
    leaf: '',
  }
  return (which) => {
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
}

export const projectDir = getProjectDirHelper()

export function getFilePathRelatedHelper(
  filepath: string
): Pick<Helper, 'normalizePathPattern'> {
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
  return {
    normalizePathPattern,
  }
}

export function getProgramRelatedHelper(
  thisProgram: NodePath<Program>
): Pick<
  Helper,
  'prependImports' | 'hasImported' | 'prependToBody' | 'appendToBody'
> {
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

  const generateImportStmt = (imp: Imports) =>
    'defaultName' in imp
      ? `import ${imp.defaultName} from '${imp.moduleName}'`
      : 'localName' in imp
      ? `import { ${imp.exportName} as ${imp.localName} } from '${imp.moduleName}'`
      : 'exportName' in imp
      ? `import { ${imp.exportName} } from '${imp.moduleName}'`
      : `import '${imp.moduleName}'`

  const prependImports: Helper['prependImports'] = (
    imports,
    program = thisProgram
  ) => {
    if (!Array.isArray(imports)) imports = [imports]
    imports.forEach((imp) => {
      if (!hasImported(imp, program.node)) {
        program.unshiftContainer(
          'body',
          statements.ast(generateImportStmt(imp))
        )
      }
    })
  }

  const prependToBody: Helper['prependToBody'] = (
    nodes,
    program = thisProgram
  ) => {
    program.unshiftContainer('body', nodes)
  }

  const appendToBody: Helper['appendToBody'] = (
    nodes,
    program = thisProgram
  ) => {
    program.pushContainer('body', nodes)
  }

  return {
    hasImported,
    prependImports,
    prependToBody,
    appendToBody,
  }
}
