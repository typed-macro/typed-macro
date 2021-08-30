import {
  CallExpression,
  File,
  ImportDeclaration,
  isIdentifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isMemberExpression,
  isStringLiteral,
  Node,
  Program,
} from '@babel/types'
import traverse, { NodePath } from '@babel/traverse'
import { ImportOption, matchImportStmt } from '@/core/helper/import'
import { Macro } from '@/core/macro'
import { NamespacedMacros } from '@/core/exports'

export function findProgramPath(ast: File) {
  let path: NodePath<Program>
  traverse(ast, {
    Program(p) {
      path = p
      p.stop()
    },
  })
  return path!
}

export function findImported(
  program: NodePath<Program>,
  imp: ImportOption,
  loose = true
) {
  // An import declaration can only be used in top-level.
  for (const path of program.get('body') as NodePath[]) {
    if (!path.isImportDeclaration()) continue
    if (matchImportStmt(imp, path.node, loose)) return path
  }
}

export type ImportedAsNS = {
  importedAsNamespace: true
  namespace: string
  local: string
  macros: Macro[]
}

export type ImportedAsNamed = {
  importedAsNamespace: false
  namespace: string
  local: string
  // not always macro
  macro?: Macro
}

export type ImportedMacro = ImportedAsNS | ImportedAsNamed

export function findImportedMacros(
  ast: Node,
  macros: NamespacedMacros,
  callback?: (path: NodePath<ImportDeclaration>) => void
) {
  const importedMacros: ImportedMacro[] = []
  const namespaces = Object.keys(macros)

  traverse(ast, {
    ImportDeclaration(path) {
      const ns = path.node.source.value
      if (!namespaces.includes(ns)) return

      // case - import 'a'
      if (!path.node.specifiers.length) return

      path.node.specifiers.forEach((s) => {
        if (isImportDefaultSpecifier(s) || isImportNamespaceSpecifier(s)) {
          // case - import a from 'a'
          // or
          // case - import * as a from 'a'
          importedMacros.push({
            importedAsNamespace: true,
            namespace: path.node.source.value,
            local: s.local.name,
            macros: macros[ns],
          })
        } else {
          // case - import { a as a } from 'a'
          const exportName = isIdentifier(s.imported)
            ? s.imported.name
            : s.imported.value

          importedMacros.push({
            importedAsNamespace: false,
            namespace: path.node.source.value,
            local: s.local.name,
            macro: macros[ns].find((m) => m.name === exportName),
          })
        }
      })
      callback?.(path)
    },
  })

  return importedMacros
}

// find macros to be applied from call expr, returns a
// - Macro: the macro to be applied
// - string: is a macro call but no macro found
// - undefined: not a macro call
type CalledMacro = Macro | string | undefined

export function getCalledMacro(
  callee: CallExpression['callee'],
  importedMacros: Array<ImportedMacro>
): CalledMacro {
  if (isMemberExpression(callee)) {
    const ns = callee.object
    if (isIdentifier(ns)) {
      const maybeMacro = importedMacros.find(
        (m) => m.importedAsNamespace && m.local === ns.name
      ) as ImportedAsNS
      if (!maybeMacro) return
      const method = callee.property
      if (isIdentifier(method)) {
        // case - namespace.method()
        return (
          maybeMacro.macros.find((m) => m.name === method.name) || method.name
        )
      } else if (isStringLiteral(method)) {
        // case - namespace['method']()
        return (
          maybeMacro.macros.find((m) => m.name === method.value) || method.value
        )
      }
    }
  } else if (isIdentifier(callee)) {
    // case - method()
    const maybeMacro = importedMacros.find(
      (m) => !m.importedAsNamespace && m.local === callee.name
    ) as ImportedAsNamed
    if (!maybeMacro) return
    return maybeMacro.macro || callee.name
  }
}

export function containsMacros(
  paths: NodePath[],
  importedMacros: ImportedMacro[]
) {
  return paths.map((path) => {
    // traverse can not process the root path
    if (
      path.isCallExpression() &&
      getCalledMacro(path.node.callee, importedMacros)
    )
      return true
    let has = false
    path.traverse({
      CallExpression({ node: { callee } }) {
        if (getCalledMacro(callee, importedMacros)) {
          has = true
          path.stop()
        }
      },
    })
    return has
  })
}
