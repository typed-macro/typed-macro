import { NodePath } from '@babel/traverse'
import { MacroHelper } from './helper'
import {
  isAsyncFunction,
  isFunction,
  isGeneratorFunction,
  VERSION,
} from '@typed-macro/shared'
import { Babel } from './babel'
import { MacroContext } from './context'

export type YieldTask =
  // yield ImportDeclaration NodePath: collect macros from it
  // yield other NodePath: expand macros in it
  | NodePath
  | NodePath[]
  // do nothing
  | undefined

export type SuspendableTransform = Generator<YieldTask, any, any>

/**
 * Async function can not be used as macro handler.
 *
 * If the handler is a normal function, the nested macros inside the current
 * call expression will be expanded automatically before calling the handler.
 *
 * If the handler is a generator function, you can:
 *  - yield node paths of import statements to collect macros from them,
 *    note that macros must be collected before used, or you can wait for the next traversal
 *    (the runtime collects imported macros before every traversal),
 *  - yield node paths of other types to actively expand macros inside them.
 *
 * e.g.
 * ```typescript
 * function* someMacro(ctx) {
 *   // do some thing
 *   yield ctx.args // expand macros inside arguments
 *   // do some thing
 *   yield someOtherNodePath
 *   // do some thing
 * }
 * ```
 */
export type MacroHandler = (
  /**
   * Macro call context.
   */
  ctx: MacroContext,
  /**
   * Babel tools to help operate node paths and nodes.
   */
  babel: Readonly<Babel>,
  /**
   * Wrappers upon babel tools to simplify operations.
   */
  helper: MacroHelper
) => SuspendableTransform | void

/**
 * @internal
 */
export type MacroCall = {
  ctx: MacroContext
  babel: Readonly<Babel>
  helper: Readonly<MacroHelper>
}

export type Macro = {
  /**
   * @internal
   */
  __is_macro: boolean
  /**
   * @internal
   */
  name: string
  /**
   * @internal
   */
  handler(call: MacroCall): SuspendableTransform
  /**
   * @internal
   */
  types: string
  /**
   * @internal
   */
  version: string
}

/**
 * @internal
 */
export type MacroMeta = {
  name: string
  signatures: {
    comment?: string
    signature: string
  }[]
  types: string[]
}

export function macro(meta: MacroMeta, handler: MacroHandler): Macro {
  return {
    name: meta.name,
    handler: normalizeHandler(handler),
    types: renderMacroTypes(meta),
    version: VERSION,
    __is_macro: true,
  }
}

export function isMacro(o: unknown): o is Macro {
  return (o as Macro)?.__is_macro ?? false
}

function normalizeHandler(handler: MacroHandler): Macro['handler'] {
  if (!isFunction(handler))
    throw new Error('macro handler should be a function')
  if (isAsyncFunction(handler))
    throw new Error('macro handler should not be an async function')
  if (handler.length === 0)
    throw new Error('macro handler should have at least one parameter')
  return isGeneratorFunction(handler)
    ? function* (call: MacroCall) {
        yield* handler(
          call.ctx,
          call.babel,
          call.helper
        ) as SuspendableTransform
      }
    : function* (call: MacroCall) {
        yield call.ctx.args
        handler(call.ctx, call.babel, call.helper)
      }
}

function renderMacroTypes({ name, types, signatures }: MacroMeta) {
  return [
    types.join('\n'),
    signatures
      .map((s) =>
        s.comment
          ? `/** ${s.comment} */
export function ${name}${s.signature}`
          : `export function ${name}${s.signature}`
      )
      .join('\n'),
  ]
    .filter((t) => !!t)
    .join('\n')
}
