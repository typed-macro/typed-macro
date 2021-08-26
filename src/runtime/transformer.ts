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
import { parse, ParserPlugin } from '@babel/parser'
import generate from '@babel/generator'
import { nodeLoc } from '@/common'
import { Macro, MacroHelper, NamespacedMacros } from './types'
import { getTransformHelper } from '@/helper/transform'
import { getPathHelper } from '@/helper/path'
import { getStateHelper, State } from '@/helper/state'
import { BABEL_TOOLS } from '@/helper/babel'

export type TransformerOptions = {
  maxRecursion?: number
  parserPlugins?: ParserPlugin[]
}

export type TransformerContext = {
  code: string
  id: string
  ssr?: boolean
  dev: boolean
}

export type Transformer = (
  ctx: TransformerContext,
  macros: NamespacedMacros
) => string | undefined

export function getTransformer({
  parserPlugins = [],
  maxRecursion = 0,
}: TransformerOptions): Transformer {
  maxRecursion = maxRecursion > 0 ? maxRecursion : 5
  parserPlugins = ['typescript', 'jsx', ...parserPlugins]

  return ({ code, id, ssr = false, dev }, macros) => {
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

    const ctx: ApplyContext = {
      code,
      filepath: id,
      ast,
      ssr,
      importedMacros,
      state: {
        thisTurn: {},
        crossTurn: {},
      },
    }

    let loopCount = 0
    while (loopCount++ < maxRecursion && applyMacros(ctx)) {
      if (loopCount === maxRecursion)
        throw new Error(
          `Reached the maximum recursion, please check macros applied in file ${id}`
        )
      ctx.importedMacros.push(...collect())
      // clear this turn's state
      ctx.state.thisTurn = {}
    }

    return generate(ast, {
      retainLines: true,
    }).code
  }
}

type ImportedAsNS = {
  importedAsNamespace: true
  namespace: string
  local: string
  macros: Macro[]
}

type ImportedAsNamed = {
  importedAsNamespace: false
  namespace: string
  local: string
  // not always macro
  macro?: Macro
}

type ImportedMacro = ImportedAsNS | ImportedAsNamed

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

            importedMacros.push({
              importedAsNamespace: false,
              namespace: path.node.source.value,
              local: s.local.name,
              macro: macros[ns].find((m) => m.name === exportName),
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
// - Macro: the macro to be applied
// - string: is a macro call but no macro found
// - undefined: not a macro call
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
    ) as ImportedAsNamed
    if (!maybeMacro) return
    return maybeMacro.macro || callee.name
  }
}

type ApplyContext = {
  code: string
  filepath: string
  ast: File
  ssr: boolean

  importedMacros: ImportedMacro[]
  state: State
}

export function applyMacros({
  code,
  filepath,
  ast,
  importedMacros,
  ssr,
  state,
}: ApplyContext): boolean {
  let applied = false

  const helper: MacroHelper = Object.freeze({
    ...getTransformHelper(ast),
    ...getPathHelper(filepath),
    ...getStateHelper(state),
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
            ssr,
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
        applied = true
      }
    },
  })

  return applied
}
