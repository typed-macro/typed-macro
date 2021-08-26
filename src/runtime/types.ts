import { CallExpression } from '@babel/types'
import { NodePath } from '@babel/traverse'
import { PathHelper } from '@/helper/path'
import { StateHelper } from '@/helper/state'
import { TransformHelper } from '@/helper/transform'
import { Babel } from '@/helper/babel'

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

export type NamespacedMacros = { [namespace: string]: Macro[] }

export type NamespacedModules = { [namespace: string]: string }

export type NamespacedTypes = {
  [namespace: string]: {
    moduleScope: string
    macroScope: string[]
  }
}
