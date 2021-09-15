import { CallExpression, File } from '@babel/types'
import traverse, { NodePath } from '@babel/traverse'
import { parse, ParserPlugin } from '@babel/parser'
import generate from '@babel/generator'
import { nodeLoc } from '@/common'
import { NamespacedMacros } from './exports'
import { createMacroCall, YieldContext } from './macro'
import {
  findProgramPath,
  ImportedMacrosContainer,
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
   * 'typescript', 'jsx' and 'importMeta'
   * are included by default and cannot be removed.
   *
   * Some plugins are enabled automatically by the latest babel parser
   * because they have been regarded as part of the language.
   *
   * @see https://babeljs.io/docs/en/babel-parser#plugins
   * @see https://babeljs.io/docs/en/babel-parser#latest-ecmascript-features
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
    const importedMacros = new ImportedMacrosContainer(macros, dev)
    importedMacros.collectFromAST(ast)

    if (!importedMacros.size) return

    const transformState = createState()

    let loopCount = 0
    while (
      applyMacros({
        code,
        filepath,
        ast,
        ssr,
        dev,
        importedMacros,
        transformState,
      }) &&
      importedMacros.collectFromAST(ast)
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

type ApplyContext = {
  code: string
  filepath: string
  ast: File
  dev: boolean
  ssr: boolean

  importedMacros: ImportedMacrosContainer
  transformState: State
}

export function applyMacros({
  code,
  filepath,
  ast,
  dev,
  ssr,
  importedMacros,
  transformState,
}: ApplyContext): boolean {
  let applied = false
  const program = findProgramPath(ast)
  const traversalState = createState()

  traverse(ast, {
    CallExpression(path) {
      if (process(path)) applied = true
    },
  })

  return applied

  function handleYield(current: NodePath<CallExpression>, ctx: YieldContext) {
    if (!ctx) return
    if (!Array.isArray(ctx)) ctx = [ctx]
    ctx.forEach((path) => {
      if (!path) return
      if (path.isImportDeclaration()) {
        // collect macros
        importedMacros.collectFromNodePath(path)
      } else {
        // apply macros
        if (current.findParent((parent) => parent.node === path.node))
          throw new Error('can not yield a parent node')
        // if is a macro call, process it and skip traverse
        if (path.isCallExpression() && process(path)) return
        path.traverse({
          CallExpression(p) {
            process(p)
          },
        })
      }
    })
  }

  function process(path: NodePath<CallExpression>) {
    const macro = importedMacros.getCalledMacro(path.get('callee'))
    if (!macro) return false
    if (typeof macro === 'string')
      throw new Error(
        `Macro '${macro}' is not existed but called in '${filepath}' near ${nodeLoc(
          path.node
        )}`
      )
    try {
      const transform = macro(
        createMacroCall({
          code,
          filepath,
          path,
          ast,
          ssr,
          dev,
          transformState,
          traversalState,
          importedMacros,
          program,
        })
      )
      for (const ctx of transform) handleYield(path, ctx)
    } catch (e) {
      throw new Error(
        `Error when apply macro '${macro.name}' in '${filepath}' near ${nodeLoc(
          path.node
        )}:\n ${e}`
      )
    }
    return true
  }
}
