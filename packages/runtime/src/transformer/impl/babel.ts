import traverse from '@babel/traverse'
import * as types from '@babel/types'
import { Babel } from '@typed-macro/core'
import template from '@babel/template'
import { parse, parseExpression } from '@babel/parser'
import generate from '@babel/generator'

export const BABEL: Babel = Object.freeze({
  template,
  traverse,
  types,
  parse,
  parseExpression,
  generate,
})
