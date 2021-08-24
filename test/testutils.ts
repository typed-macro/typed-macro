import { parse } from '@babel/parser'
import { File } from '@babel/types'
import generate from '@babel/generator'
import template from '@babel/template'

export function getAST(code: string) {
  return parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  })
}

export function getStatement(code: string) {
  return template.statement.ast(code)
}

export function getExpression(code: string) {
  return template.expression.ast(code)
}

export function matchCodeSnapshot(ast: File) {
  expect(generate(ast).code).toMatchSnapshot()
}

/* eslint-disable @typescript-eslint/no-empty-function */
export const NO_OP = () => {}
