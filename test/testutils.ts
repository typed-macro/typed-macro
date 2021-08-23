import { parse } from '@babel/parser'
import { File } from '@babel/types'
import generate from '@babel/generator'

export function getAST(code: string) {
  return parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  })
}

export function matchCodeSnapshot(ast: File) {
  expect(generate(ast).code).toMatchSnapshot()
}
