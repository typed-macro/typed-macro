import { File, ImportDeclaration, Node } from '@babel/types'
import traverse, { NodePath } from '@babel/traverse'
import template from '@babel/template'
import { parse, ParserPlugin } from '@babel/parser'
import generate from '@babel/generator'
import { nodeLoc } from '@/common'
import { NamespacedMacros } from './exports'
import { Macro } from './macro'
import { versioned } from '@/core/version'
import {
  findImportedMacros,
  findProgramPath,
  getCalledMacro,
} from '@/core/helper/traverse'
import { createState, State } from './helper/state'

export type TransformerOptions = {
  /**
   * The max recursion for applying macros, default to 5.
   *
   * After reached the maxRecursions, plugin will throw out an error.
   *
   * It's usually caused by forgetting to remove/modify the call expression
   * in macros.
   */
  maxRecursions?: number
  /**
   * Babel plugins to be applied during parsing.
   *
   * By default 'typescript' and 'jsx' are included and cannot be removed.
   */
  parserPlugins?: ParserPlugin[]
}

export type TransformerContext = {
  code: string
  filepath: string
  ssr?: boolean
  dev: boolean
}

export type Transformer = (
  ctx: TransformerContext,
  macros: NamespacedMacros
) => string | undefined

export function createTransformer({
  parserPlugins = [],
  maxRecursions = 0,
}: TransformerOptions): Transformer {
  maxRecursions = maxRecursions > 0 ? maxRecursions : 5
  parserPlugins = ['typescript', 'jsx', ...parserPlugins]

  return ({ code, filepath, ssr = false, dev }, macros) => {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: parserPlugins,
    })

    // Note: keep import statements in dev mode so can invalidate macro modules
    const collect = () => collectImportedMacros(ast, macros, dev)

    const importedMacros = collect()
    if (!importedMacros.length) return

    const transformState = createState()

    let loopCount = 0
    while (
      applyMacros({
        code,
        filepath,
        ast,
        ssr,
        importedMacros,
        transformState,
      }) &&
      importedMacros.push(...collect())
    ) {
      if (loopCount++ >= maxRecursions)
        throw new Error(
          `Reached the maximum recursion when apply macros on ${filepath}`
        )
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
  const importPaths: NodePath<ImportDeclaration>[] = []
  const importedMacros = findImportedMacros(ast, macros, (path) =>
    importPaths.push(path)
  )
  if (keepImportStmt) {
    importPaths.forEach((p) =>
      p.replaceWith(template.statement.ast(`import '${p.node.source.value}'`))
    )
  } else {
    importPaths.forEach((p) => p.remove())
  }
  return importedMacros
}

type ApplyContext = {
  code: string
  filepath: string
  ast: File
  ssr: boolean

  importedMacros: ImportedMacro[]
  transformState: State
}

export function applyMacros({
  code,
  filepath,
  ast,
  importedMacros,
  ssr,
  transformState,
}: ApplyContext): boolean {
  let applied = false
  const program = findProgramPath(ast)
  const traversalState = createState()

  traverse(ast, {
    CallExpression(path) {
      const macroToApply = getCalledMacro(path.node.callee, importedMacros)
      if (!macroToApply) return
      if (typeof macroToApply === 'string')
        throw new Error(
          `Macro ${macroToApply} is not existed but is called in ${filepath}`
        )

      try {
        macroToApply(
          versioned({
            code,
            filepath,
            path,
            ssr,
            ast,
            transformState,
            traversalState,
            importedMacros,
            program,
          })
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
