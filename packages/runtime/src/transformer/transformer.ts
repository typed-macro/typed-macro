import traverse, { NodePath } from '@babel/traverse'
import { EnvContext, Macro, YieldTask } from '@typed-macro/core'
import { CallExpression } from '@babel/types'
import { createState } from './impl/state'
import { parse, ParserPlugin } from '@babel/parser'
import {
  createImportedMacroContainer,
  findProgramPath,
  nodeLoc,
} from './traverse'
import generate from '@babel/generator'
import { BABEL } from './impl/babel'
import { createMacroHelper } from './impl/macroHelper'
import { isArray } from '@typed-macro/shared'
import { ModularizedMacros } from '../normalizer'

export type Transformer = {
  /**
   * Append macros into transformer.
   */
  appendMacros(moduleName: string, macros: Macro[]): void
  /**
   * Append parser plugins into transformer.
   * @see MacroProviderOptions.parserPlugins
   */
  appendParserPlugins(plugins: ParserPlugin[]): void
  /**
   * Transform a file.
   *
   * Returns undefined if no macro applied.
   */
  transform(code: string, id: string, env: EnvContext): string | undefined
}

export type TransformerOptions = {
  /**
   * The max traversal times for applying macros.
   *
   * An error will be thrown if reached the maxTraversals. It's usually caused
   * by forgetting to remove/modify the call expression in macros.
   *
   * @default 5
   */
  maxTraversals?: number

  /**
   * @see MacroProviderOptions.parserPlugins
   */
  parserPlugins?: ParserPlugin[]
}

export function createTransformer(options: TransformerOptions): Transformer {
  // init
  const macros: ModularizedMacros = Object.create(null)
  const appendMacros = (moduleName: string, ms: Macro[]) => {
    const m = macros[moduleName] || (macros[moduleName] = [])
    m.push(...ms)
    checkMacrosDuplicated(moduleName, m)
  }

  let parserPlugins: ParserPlugin[] = ['typescript', 'jsx']
  const appendParserPlugins = (plugins: ParserPlugin[]) => {
    parserPlugins = Array.from(new Set([...parserPlugins, ...plugins]))
  }

  // apply options
  const maxTraversals =
    options.maxTraversals && options.maxTraversals > 1
      ? options.maxTraversals
      : 5
  if (options.parserPlugins) appendParserPlugins(options.parserPlugins)

  return {
    appendMacros,
    appendParserPlugins,
    transform: (code, filepath, env) => {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: parserPlugins,
      })

      // keep import statements in dev mode so can invalidate macro modules
      const importedMacros = createImportedMacroContainer(macros)

      importedMacros.collectFromAST(ast)

      if (!importedMacros.size()) return

      const transformState = createState()

      let traversalTimes = 0
      while (applyMacros()) {
        importedMacros.collectFromAST(ast)
        if (traversalTimes++ >= maxTraversals)
          throw new Error(
            `Reached the maximum traversal times (${maxTraversals}) when apply macros on '${filepath}'`
          )
      }

      return generate(ast, {
        retainLines: true,
      }).code

      function applyMacros() {
        let applied = false
        const program = findProgramPath(ast)
        const traversalState = createState()

        traverse(ast, {
          CallExpression(path) {
            if (process(path)) applied = true
          },
        })

        return applied

        function handleYield(
          current: NodePath<CallExpression>,
          ctx: YieldTask
        ) {
          if (!ctx) return
          if (!isArray(ctx)) ctx = [ctx]
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
              // find macro call children
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
            const transform = macro.handler({
              ctx: {
                ...env,
                filepath,
                code,
                ast,
                path,
                args: path.get('arguments'),
                state: {
                  transform: transformState,
                  traversal: traversalState,
                },
              },
              babel: BABEL,
              helper: createMacroHelper(program, importedMacros),
            })
            for (const ctx of transform) handleYield(path, ctx)
          } catch (e) {
            throw new Error(
              `Error when apply macro '${
                macro.name
              }' in '${filepath}' near ${nodeLoc(path.node)}:\n ${e}`
            )
          }
          return true
        }
      }
    },
  }
}

function checkMacrosDuplicated(moduleName: string, macros: Macro[]) {
  const mem = Object.create(null)
  macros.forEach((m) => {
    if (mem[m.name])
      throw new Error(`macro '${m.name}' in '${moduleName}' is duplicated`)

    mem[m.name] = 1
  })
}
