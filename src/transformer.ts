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
} from '@babel/types'
import traverse, { NodePath } from '@babel/traverse'
import template from '@babel/template'
import { Macro } from '@/macro'
import { BABEL_TOOLS, getHelper } from '@/helper'
import { parse, ParserPlugin } from '@babel/parser'
import generate from '@babel/generator'
import { nodeLoc } from '@/common'

export type NamespacedMacros = { [namespace: string]: Macro[] }

export type TransformerOptions = {
  macros: NamespacedMacros

  maxRecursion: number
  parserPlugins: ParserPlugin[]
}

export function getTransformer({
  parserPlugins,
  maxRecursion,
  macros,
}: TransformerOptions) {
  throwErrorIfConflict(macros)

  return (code: string, id: string, dev: boolean) => {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: parserPlugins,
    })

    const collect = () =>
      collectImportedMacros(
        ast,
        macros,
        // Note: keep import statements in dev mode so can invalidate macro modules
        dev /* keep import stmt */
      )
    const importedMacros = collect()
    if (!importedMacros.length) return

    const applyCtx: ApplyContext = {
      code,
      filepath: id,
      ast,
      importedMacros,
    }

    let loopCount = 0
    while (loopCount < maxRecursion) {
      const { applied, recollectMacros } = applyMacros(applyCtx)
      if (!applied) break
      if (recollectMacros) importedMacros.push(...collect())

      loopCount++
      if (loopCount === maxRecursion)
        throw new Error(
          `Reached the maximum recursion, please check macros applied in file ${id}`
        )
    }

    return generate(ast, {
      retainLines: true,
    }).code
  }
}

export function throwErrorIfConflict(macros: NamespacedMacros) {
  Object.keys(macros).forEach((ns) => {
    const mem = Object.create(null)
    macros[ns].forEach((m) => {
      if (mem[m.name]) {
        throw new Error(
          `Error when loading macros: a macro with name '${m.name}' in '${ns}' already existed`
        )
      }
      mem[m.name] = 1
    })
  })
}

type ImportedAsNS = {
  importedAsNamespace: true
  namespace: string
  local: string
  macros: Macro[]
}

type ImportedAsFn = {
  importedAsNamespace: false
  namespace: string
  local: string
  macro: Macro
}

type ImportedMacro = ImportedAsNS | ImportedAsFn

export function collectImportedMacros(
  ast: Node,
  macros: NamespacedMacros,
  keepImportStmt = false
) {
  const importedMacros: ImportedMacro[] = []
  const namespaces = Object.keys(macros)
  {
    const importPaths: NodePath<ImportDeclaration>[] = []
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
            const macro = macros[ns].find((m) => m.name === exportName)
            if (!macro)
              throw new Error(
                `Macro ${exportName} is not existed but is imported from '${ns}'`
              )
            importedMacros.push({
              importedAsNamespace: false,
              namespace: path.node.source.value,
              local: s.local.name,
              macro,
            })
          }
        })
        importPaths.push(path)
      },
    })
    if (keepImportStmt) {
      importPaths.forEach((p) =>
        p.replaceWith(template.statement.ast(`import '${p.node.source.value}'`))
      )
    } else {
      importPaths.forEach((p) => p.remove())
    }
  }
  return importedMacros
}

// find macros to be applied from call expr, returns a
// - Macro: has origin
// - string: has origin name but no origin macro found
// - undefined: no origin name found
export function findCalledMacro(
  callee: CallExpression['callee'],
  importedMacros: Array<ImportedMacro>
) {
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
    ) as ImportedAsFn
    if (!maybeMacro) return
    return maybeMacro.macro
  }
}

type ApplyContext = {
  code: string
  filepath: string
  ast: File

  importedMacros: ImportedMacro[]
}

type ApplyResult = {
  applied: boolean
  recollectMacros: boolean
}

export function applyMacros({
  code,
  filepath,
  ast,
  importedMacros,
}: ApplyContext): ApplyResult {
  const result: ApplyResult = {
    applied: false,
    recollectMacros: false,
  }

  const helper = Object.freeze({
    forceRecollectMacros: () => (result.recollectMacros = true),
    ...getHelper(filepath, ast),
  })

  traverse(ast, {
    CallExpression(path) {
      const macroToApply = findCalledMacro(path.node.callee, importedMacros)
      if (!macroToApply) return

      if (typeof macroToApply === 'string')
        throw new Error(
          `Macro ${macroToApply} is not existed but is called in ${filepath}`
        )

      try {
        macroToApply.apply(
          {
            code,
            filepath,
            path,
            args: path.node.arguments,
          },
          BABEL_TOOLS,
          helper
        )
      } catch (e) {
        throw new Error(
          `Error when apply macro ${
            macroToApply.name
          } in ${filepath} near ${nodeLoc(path.node)}:\n ${e}`
        )
      } finally {
        result.applied = true
      }
    },
  })

  return result
}
