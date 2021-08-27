import { CallExpression } from '@babel/types'
import { NodePath } from '@babel/traverse'
import { Babel, PathHelper, StateHelper, TransformHelper } from '@/core/helper'

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
  /*
   * The NodePath of the call-macro expression currently being handled.
   */
  path: NodePath
  /*
   * Whether in ssr mode.
   */
  ssr: boolean
}

export type MacroHelper = TransformHelper & PathHelper & StateHelper

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
) => void

export type Macro = {
  name: string
  apply: MacroHandler
}

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
  return {
    name,
    apply: handler,
    __types: renderMetaType(name, meta),
  } as InternalMacro
}

export function isMacro(o: unknown): o is InternalMacro {
  return !!(o as InternalMacro).__types
}

export function renderMetaType(name: string, meta: MacroMeta) {
  return [
    meta.types.join('\n'),
    meta.signatures
      .map((s) =>
        s.comment
          ? `  /** ${s.comment} **/
  export function ${name}${s.signature}`
          : `  export function ${name}${s.signature}`
      )
      .join('\n'),
  ]
    .filter((t) => !!t)
    .join('\n')
}
