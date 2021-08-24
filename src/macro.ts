import { NodePath } from '@babel/traverse'
import { CallExpression } from '@babel/types'
import { Helper, Babel } from '@/helper'

export type Context = {
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
}

export type MacroHandler = (
  /**
   * Context about the macro caller.
   */
  ctx: Context,
  /**
   * Babel tools to help operate node paths and nodes.
   */
  babel: Readonly<Babel>,
  /**
   * Wrappers upon babel tools to simplify operations.
   */
  helper: Readonly<Helper>
) => void

export type MacroMeta = {
  signatures: {
    comment?: string
    signature: string
  }[]
  types: string[]
}

export type Macro = {
  name: string
  apply: MacroHandler
}

export type MacroWithMeta = Macro & {
  meta: MacroMeta
}
