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
import traverse, { NodePath, Scope } from '@babel/traverse'
import { Macro } from '@typed-macro/core'
import { ModularizedMacros } from '../normalizer'

export const nodeLoc = (node: Node) =>
  node.loc
    ? `line ${node.loc.start.line}, column ${node.loc.start.column}`
    : 'unknown'

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

export type ImportedAsNS = {
  importedAsNamespace: true
  moduleName: string
  local: string
  macros: Macro[]
}

export type ImportedAsNamed = {
  importedAsNamespace: false
  moduleName: string
  local: string
  // not always macro
  macro?: Macro
}

export type ImportedMacro = ImportedAsNS | ImportedAsNamed

function isLocalDefined(scope: Scope, name: string) {
  // local-defined identifiers must have bindings,
  // macros don't have bindings,
  // but no bindings doesn't mean is a macro,
  // e.g. console.log(), `console` has no bindings too.
  return scope.getBinding(name)
}

// find macros to be applied from call expr, returns a
// - Macro: the macro to be applied
// - string: is a macro call but no macro found
// - undefined: not a macro call
type CalledMacro = Macro | string | undefined

export type ImportedMacroContainer = {
  size(): number
  collectFromAST(ast: File, keepImportStmt?: boolean): void
  collectFromNodePath(
    path: NodePath<ImportDeclaration>,
    keepImportStmt?: boolean
  ): void
  getCalledMacro(callee: NodePath<CallExpression['callee']>): CalledMacro
  testContainsMacros(paths: NodePath[]): boolean[]
}

export function createImportedMacroContainer(
  macros: ModularizedMacros,
  container: ImportedMacro[] = []
): ImportedMacroContainer {
  return {
    size: () => container.length,
    collectFromAST,
    collectFromNodePath,
    getCalledMacro,
    testContainsMacros,
  }

  function collectFromAST(ast: File) {
    const handler = (path: NodePath<ImportDeclaration>) =>
      collectFromNodePath(path)

    traverse(ast, {
      ImportDeclaration(path) {
        handler(path)
      },
    })

    // update scope so that macros don't have bindings now
    findProgramPath(ast).scope.crawl()
  }

  function collectFromNodePath(path: NodePath<ImportDeclaration>) {
    const moduleName = path.node.source.value
    if (!(moduleName in macros)) return

    // path.node.specifiers.length === 0 if `import 'a'`
    path.node.specifiers.forEach((s) => {
      if (isImportDefaultSpecifier(s) || isImportNamespaceSpecifier(s)) {
        // case - import a from 'a'
        // or
        // case - import * as a from 'a'
        container.push({
          importedAsNamespace: true,
          moduleName: path.node.source.value,
          local: s.local.name,
          macros: macros[moduleName],
        })
      } else {
        // case - import { a as a } from 'a'
        const exportName = isIdentifier(s.imported)
          ? s.imported.name
          : s.imported.value

        container.push({
          importedAsNamespace: false,
          moduleName: path.node.source.value,
          local: s.local.name,
          macro: macros[moduleName].find((m) => m.name === exportName),
        })
      }
    })

    // remove import statement
    path.remove()
  }

  // get called macros from the node path
  function getCalledMacro(
    callee: NodePath<CallExpression['callee']>
  ): CalledMacro {
    const node = callee.node
    if (isMemberExpression(node)) {
      const ns = node.object
      if (isIdentifier(ns)) {
        if (isLocalDefined(callee.scope, ns.name)) return
        const maybeMacro = container.find(
          (m) => m.importedAsNamespace && m.local === ns.name
        ) as ImportedAsNS
        if (!maybeMacro) return
        const method = node.property
        if (isIdentifier(method)) {
          // case - namespace.method()
          return (
            maybeMacro.macros.find((m) => m.name === method.name) || method.name
          )
        } else if (isStringLiteral(method)) {
          // case - namespace['method']()
          return (
            maybeMacro.macros.find((m) => m.name === method.value) ||
            method.value
          )
        }
      }
    } else if (isIdentifier(node)) {
      if (isLocalDefined(callee.scope, node.name)) return
      // case - method()
      const maybeMacro = container.find(
        (m) => !m.importedAsNamespace && m.local === node.name
      ) as ImportedAsNamed
      if (!maybeMacro) return
      return maybeMacro.macro || node.name
    }
  }

  // test if the node paths contains macro calls
  function testContainsMacros(paths: NodePath[]) {
    return paths.map((path) => {
      // traverse can not process the root path
      if (path.isCallExpression() && getCalledMacro(path.get('callee')))
        return true
      let has = false
      path.traverse({
        CallExpression(p) {
          if (getCalledMacro(p.get('callee'))) {
            has = true
            p.stop()
          }
        },
      })
      return has
    })
  }
}
