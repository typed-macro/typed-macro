import { CallExpression, File } from '@babel/types'
import { NodePath } from '@babel/traverse'
import { EnvContext, State } from '@typed-macro/core'

export type MacroTransformContext = {
  /**
   * The file path of the module currently being handled.
   */
  filepath: string
  /**
   * The original source code of the module currently being handled.
   */
  code: string
  /**
   * The arguments node paths of the call-macro expression currently being handled.
   */
  args: CallExpression['arguments'] extends Array<infer R>
    ? NodePath<R>[]
    : never
  /**
   * The NodePath of the call-macro expression currently being handled.
   */
  path: NodePath<CallExpression>
  /**
   * The AST being traversed.
   */
  ast: File
  /**
   * Traversal state.
   *
   * In order to recursively expand all macros in a file,
   * the transformer will traverse the AST many times until all macros
   * are expanded.
   *
   * - {@link MacroTransformContext.state.traversal} is the state shared during one traversal, and
   * - {@link MacroTransformContext.state.transform} is the state shared during the whole transformation.
   */
  state: {
    /**
     * @see MacroContext.state
     */
    traversal: State
    /**
     * @see MacroContext.state
     */
    transform: State
  }
}

export type MacroContext = EnvContext & MacroTransformContext
