import { NodePath } from '@babel/traverse'
import { ImportDeclaration, Program, Node } from '@babel/types'

/**
 * ```typescript
 * import 'moduleName'
 * { moduleName: string }
 *
 * import defaultName from 'moduleName'
 * { defaultName: string; moduleName: string }
 *
 * import { exportName } from 'moduleName'
 * { exportName: string; moduleName: string }
 *
 * import { exportName as localName } from 'moduleName'
 * { localName: string; exportName: string; moduleName: string }
 *
 * import * as namespaceName from 'moduleName'
 * { namespaceName: string; moduleName: string }
 * ```
 */
export type ImportOption =
  | { moduleName: string }
  | { defaultName: string; moduleName: string }
  | { localName: string; exportName: string; moduleName: string }
  | { exportName: string; moduleName: string }
  | { namespaceName: string; moduleName: string }

export type MacroHelper = {
  /**
   * Prepend import statements to program.
   *
   * If a same import already exists, it will not be re-imported.
   *
   * @param imports - an array of import options
   * @param program - node path of the target program for prepending import statements.
   * use the one currently being handled by default.
   * @return an array of node paths of the inserted import statements or the existed import statements,
   * in the same order of the input imports options.
   */
  prependImports(
    imports: ImportOption[],
    program?: NodePath<Program>
  ): NodePath<ImportDeclaration>[]
  /**
   * Prepend an import statement to program.
   * @see MacroHelper.prependImports
   */
  prependImports(
    imports: ImportOption,
    program?: NodePath<Program>
  ): NodePath<ImportDeclaration>

  /**
   * Append import statements to the last import statement of the program.
   *
   * Note that the order of import statements may affect the order in which modules are executed.
   *
   * @see https://stackoverflow.com/questions/35551366/69822046#69822046
   * @see MacroHelper.prependImports
   */
  appendImports(
    imports: ImportOption[],
    program?: NodePath<Program>
  ): NodePath<ImportDeclaration>[]
  /**
   * Append an import statement to the last import statement of the program.
   * @see MacroHelper.appendImports
   */
  appendImports(
    imports: ImportOption,
    program?: NodePath<Program>
  ): NodePath<ImportDeclaration>

  /**
   * Find import statements that exist already.
   *
   * Note that findImported() can not find imported macros.
   *
   * @param imports - import options
   * @param loose - match loosely, e.g:
   * `import { a as _a } from 'a'` will match both `{ moduleName: 'a' }` and `{ moduleName: 'a', exportName: 'a' }`.
   *  Defaults to false.
   * @param program - node path of the target program. use the one currently being handled by default.
   */
  findImported(
    imports: ImportOption[],
    loose?: boolean,
    program?: NodePath<Program>
  ): (NodePath<ImportDeclaration> | undefined)[]
  /**
   * Find an import statement that exists already.
   *
   * @see MacroHelper.findImported
   */
  findImported(
    imports: ImportOption,
    loose?: boolean,
    program?: NodePath<Program>
  ): NodePath<ImportDeclaration> | undefined

  /**
   * Prepend nodes to the target program.
   *
   * @param nodes - an array of nodes
   * @param program - node path of the target program. use the one currently being handled by default.
   * @return an array of node paths of the inserted nodes
   */
  prependToBody(nodes: Node[], program?: NodePath<Program>): NodePath[]
  /**
   * Prepend a node to the target program.
   * @see MacroHelper.prependToBody
   */
  prependToBody(node: Node, program?: NodePath<Program>): NodePath

  /**
   * Append any node to the target program.
   * @see MacroHelper.prependToBody
   */
  appendToBody(nodes: Node[], program?: NodePath<Program>): NodePath[]
  /**
   * Append a node to the target program.
   * @see MacroHelper.appendToBody
   */
  appendToBody(nodes: Node, program?: NodePath<Program>): NodePath

  /**
   * Check whether there are unexpanded macros inside the nodes.
   * @param paths - the node path to be checked
   */
  containsMacros(paths: NodePath[]): boolean[]
  /**
   * Check whether there are unexpanded macros inside the node.
   * @see MacroHelper.containsMacros
   */
  containsMacros(path: NodePath): boolean
}
