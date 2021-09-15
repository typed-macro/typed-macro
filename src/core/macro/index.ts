import { CallExpression, File, Node, Program } from '@babel/types'
import { NodePath } from '@babel/traverse'

import { State } from '@/core/helper/state'
import { createHelper, MacroHelper } from './helper'
import { Babel, BABEL_TOOLS } from './babel'
import { versionedMacro } from '@/core/compat'
import { isAsyncFunction, isFunction, isGeneratorFunction } from '@/common'
import { ImportedMacrosContainer } from '../helper/traverse'

export type MacroContext = {
  /**
   * The file path of the module currently being handled.
   */
  filepath: string
  /**
   * The original source code of the module currently being handled.
   */
  code: string
  /**
   * The arguments nodes of the call-macro expression currently being handled.
   */
  args: CallExpression['arguments']
  /**
   * The NodePath of the call-macro expression currently being handled.
   */
  path: NodePath<CallExpression>
  /**
   * The AST being traversed.
   */
  ast: File
  /**
   * Whether in ssr mode.
   */
  ssr: boolean
  /**
   * Whether in dev mode.
   */
  dev: boolean
  /**
   * Traversal state.
   */
  state: {
    /**
     * In order to recursively expand all macros in a file,
     * the transformer will traverse the AST many times until all macros
     * are expanded.
     *
     * - {@link traversal} is the state shared during one traversal, and
     * - {@link transform} is the state shared during the whole transformation.
     */
    traversal: State
    /**
     * @see traversal
     */
    transform: State
  }
}

export type YieldContext =
  // yield ImportDeclaration NodePath: collect macros from it
  // yield other NodePath: expand macros in it
  | NodePath<Node | Node[]>
  | NodePath<Node | Node[]>[]
  // do nothing
  | undefined

export type SuspendableTransform = Generator<YieldContext, any, any>

export type MacroHandler = (
  /**
   * Context about the macro caller.
   */
  ctx: MacroContext,
  /**
   * Babel tools to help operate node paths and nodes.
   */
  babel: Readonly<Babel>,
  /**
   * Wrappers upon babel tools to simplify operations.
   */
  helper: Readonly<MacroHelper>
) => SuspendableTransform | unknown

type MacroCall = {
  ctx: MacroContext
  babel: Readonly<Babel>
  helper: Readonly<MacroHelper>
}

export type Macro = (call: MacroCall) => SuspendableTransform

export type MacroMeta = {
  signatures: {
    comment?: string
    signature: string
  }[]
  types: string[]
}

type InternalMacro = Macro & {
  __types: string
}

export function macro(
  name: string,
  meta: MacroMeta,
  handler: MacroHandler
): Macro {
  if (!isFunction(handler))
    throw new Error('macro handler should be a function')
  if (isAsyncFunction(handler))
    throw new Error('macro handler should not be an async function')
  if (handler.length === 0)
    throw new Error('macro handler should have at least one parameter')

  const m = isGeneratorFunction(handler)
    ? {
        *[name](call: MacroCall) {
          yield* handler(
            call.ctx,
            call.babel,
            call.helper
          ) as SuspendableTransform
        },
      }[name]
    : {
        *[name](call: MacroCall) {
          yield call.ctx.path.get('arguments')
          handler(call.ctx, call.babel, call.helper)
        },
      }[name]
  ;(m as InternalMacro).__types = renderMetaType(name, meta)
  return versionedMacro(m)
}

export function isMacro(o: unknown): o is InternalMacro {
  return (o as InternalMacro)?.__types !== undefined ?? false
}

export function renderMetaType(name: string, meta: MacroMeta) {
  return [
    meta.types.join('\n'),
    meta.signatures
      .map((s) =>
        s.comment
          ? `  /* ${s.comment} */
  export function ${name}${s.signature}`
          : `  export function ${name}${s.signature}`
      )
      .join('\n'),
  ]
    .filter((t) => !!t)
    .join('\n')
}

type RawMacroCall = {
  filepath: string
  code: string
  path: NodePath<CallExpression>
  ast: File
  program: NodePath<Program>
  ssr: boolean
  dev: boolean
  traversalState: State
  transformState: State
  importedMacros: ImportedMacrosContainer
}

export function createMacroCall({
  filepath,
  ssr,
  dev,
  ast,
  code,
  path,
  transformState,
  traversalState,
  program,
  importedMacros,
}: RawMacroCall): MacroCall {
  return {
    ctx: {
      filepath,
      code,
      ast,
      path,
      ssr,
      dev,
      args: path.node.arguments,
      state: {
        transform: transformState,
        traversal: traversalState,
      },
    },
    babel: BABEL_TOOLS,
    helper: createHelper(path, program, filepath, importedMacros),
  }
}
