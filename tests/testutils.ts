import { parse } from '@babel/parser'
import { File } from '@babel/types'
import generate from '@babel/generator'
import template from '@babel/template'
import { join } from 'path'
import { tmpdir } from 'os'
import { createServer, ViteDevServer } from 'vite'
import { mkdtemp, rm } from 'fs/promises'

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

export async function withTempPath(path: string, fn: (path: string) => any) {
  const tempDir = await mkdtemp(join(tmpdir(), 'macros-'))
  await fn(join(tempDir, path))
  await rm(tempDir, {
    force: true,
    recursive: true,
  })
}

export async function withDevServer(fn: (server: ViteDevServer) => any) {
  const server = await createServer()
  await fn(server)
  await server.close()
}
