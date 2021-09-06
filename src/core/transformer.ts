import { File } from '@babel/types'
import traverse from '@babel/traverse'
import { parse, ParserPlugin } from '@babel/parser'
import generate from '@babel/generator'
import { nodeLoc } from '@/common'
import { NamespacedMacros } from './exports'
import { Macro } from './macro'
import { CURRENT_MACRO_CALL_VERSION, versioned } from '@/core/version'
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
   * 'typescript' and 'importMeta' for all files, 'jsx' for jsx/tsx files
   * are included by default and cannot be removed.
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
  parserPlugins = ['typescript', 'jsx', 'importMeta', ...parserPlugins]

  return ({ code, filepath, ssr = false, dev }, macros) => {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: parserPlugins,
    })

    // keep import statements in dev mode so can invalidate macro modules
    const collect = () => findImportedMacros(ast, macros, dev)

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
          `Reached the maximum recursion when apply macros on '${filepath}'`
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
      const macroToApply = getCalledMacro(path.get('callee'), importedMacros)
      if (!macroToApply) return
      if (typeof macroToApply === 'string')
        throw new Error(
          `Macro '${macroToApply}' is not existed but is called in '${filepath}'`
        )

      try {
        macroToApply(
          versioned(
            {
              code,
              filepath,
              path,
              ssr,
              ast,
              transformState,
              traversalState,
              importedMacros,
              program,
            },
            CURRENT_MACRO_CALL_VERSION
          )
        )
      } catch (e) {
        throw new Error(
          `Error when apply macro '${
            macroToApply.name
          }' in '${filepath}' near ${nodeLoc(path.node)}:\n ${e}`
        )
      } finally {
        applied = true
      }
    },
  })

  return applied
}
