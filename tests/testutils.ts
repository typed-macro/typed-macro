import { parse } from '@babel/parser'
import { File } from '@babel/types'
import generate from '@babel/generator'
import template from '@babel/template'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

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

export function withTempPath(path: string, fn: (path: string) => any) {
  const tempDir = mkdtempSync(join(tmpdir(), 'macros-'))
  Promise.resolve(fn(join(tempDir, path))).then(() =>
    rmSync(tempDir, {
      force: true,
      recursive: true,
    })
  )
}
