import template from '@babel/template'
import traverse from '@babel/traverse'
import * as types from '@babel/types'
import { parse, parseExpression } from '@babel/parser'
import generate from '@babel/generator'

export type Babel = {
  /**
   * From @babel/template.
   * Help generate nodes from code string.
   *
   * e.g.
   * ```typescript
   * template.statement.ast('const a = 1') // generate a statement node
   * ```
   */
  template: typeof template

  /**
   * From @babel/traverse.
   * Help traverse from a node.
   *
   * e.g.
   * ```typescript
   * traverse(someNode, {
   *   CallExpression(path) {
   *     ...
   *   }
   * })
   * ```
   */
  traverse: typeof traverse

  /**
   * From @babel/types.
   * Help check node type and create nodes of specific type.
   *
   * e.g.
   * ```typescript
   *  types.isIdentifier(someNode) // check is identifier
   *  types.identifier('hello') // create identifier node
   * ```
   */
  types: typeof types

  /**
   * From @babel/parser.
   * Help parse code string to ast.
   *
   * e.g.
   * ```typescript
   *  parse('const a = 1')
   * ```
   */
  parse: typeof parse

  /**
   * From @babel/parser.
   * Help parse code string to expression.
   *
   * e.g.
   * ```typescript
   *  parseExpression('1 + 2')
   * ```
   */
  parseExpression: typeof parseExpression

  /**
   * From @babel/generator.
   * Help generate code string from ast.
   *
   * e.g.
   * ```typescript
   *  generate(someNode)
   * ```
   */
  generate: typeof generate
}

export const BABEL_TOOLS: Babel = Object.freeze({
  template,
  traverse,
  types,
  parse,
  parseExpression,
  generate,
})
