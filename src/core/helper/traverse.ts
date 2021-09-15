import {
  CallExpression,
  File,
  ImportDeclaration,
  isIdentifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isMemberExpression,
  isStringLiteral,
  Program,
} from '@babel/types'
import traverse, { NodePath, Scope } from '@babel/traverse'
import { ImportOption, matchImportStmt } from '@/core/helper/import'
import { Macro } from '@/core/macro'
import { NamespacedMacros } from '@/core/exports'
import template from '@babel/template'

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

export class ImportedMacrosContainer {
  constructor(
    private _macros: NamespacedMacros,
    private _keepImportStmt = false,
    private _container: ImportedMacro[] = []
  ) {}

  get size() {
    return this._container.length
  }

  get container() {
    return this._container
  }

  collectFromAST(ast: File, keepImportStmt = this._keepImportStmt) {
    const handler = (path: NodePath<ImportDeclaration>) =>
      this.collectFromNodePath(path, keepImportStmt)

    traverse(ast, {
      ImportDeclaration(path) {
        handler(path)
      },
    })

    // update scope so that macros don't have bindings now
    findProgramPath(ast).scope.crawl()

    return this
  }

  collectFromNodePath(
    path: NodePath<ImportDeclaration>,
    keepImportStmt = this._keepImportStmt
  ) {
    const ns = path.node.source.value
    if (!(ns in this._macros)) return

    // case - import 'a'
    if (!path.node.specifiers.length) return

    path.node.specifiers.forEach((s) => {
      if (isImportDefaultSpecifier(s) || isImportNamespaceSpecifier(s)) {
        // case - import a from 'a'
        // or
        // case - import * as a from 'a'
        this._container.push({
          importedAsNamespace: true,
          namespace: path.node.source.value,
          local: s.local.name,
          macros: this._macros[ns],
        })
      } else {
        // case - import { a as a } from 'a'
        const exportName = isIdentifier(s.imported)
          ? s.imported.name
          : s.imported.value

        this._container.push({
          importedAsNamespace: false,
          namespace: path.node.source.value,
          local: s.local.name,
          macro: this._macros[ns].find((m) => m.name === exportName),
        })
      }
    })
    keepImportStmt
      ? path.replaceWith(
          template.statement.ast(`import '${path.node.source.value}'`)
        )
      : path.remove()

    return this
  }

  // get called macros from the node path
  getCalledMacro(callee: NodePath<CallExpression['callee']>): CalledMacro {
    const node = callee.node
    if (isMemberExpression(node)) {
      const ns = node.object
      if (isIdentifier(ns)) {
        if (isLocalDefined(callee.scope, ns.name)) return
        const maybeMacro = this._container.find(
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
      const maybeMacro = this._container.find(
        (m) => !m.importedAsNamespace && m.local === node.name
      ) as ImportedAsNamed
      if (!maybeMacro) return
      return maybeMacro.macro || node.name
    }
  }

  // test if the node paths contains macro calls
  testContainsMacros(paths: NodePath[]) {
    const getCalledMacro = this.getCalledMacro.bind(this)

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
