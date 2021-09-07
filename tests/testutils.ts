import { parse } from '@babel/parser'
import { File, Program } from '@babel/types'
import generate from '@babel/generator'
import template from '@babel/template'
import { join } from 'path'
import { tmpdir } from 'os'
import { createServer, ViteDevServer } from 'vite'
import { mkdtemp, rm } from 'fs/promises'
import { isMacro, macro, MacroHandler, MacroMeta } from '@/core/macro'
import traverse, { NodePath } from '@babel/traverse'
import { Runtime, RuntimeOptions } from '@/core/runtime'
import { NormalizedExports } from '@/core/exports'

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

export function getPath(code: string) {
  let p: NodePath<Program>
  traverse(parse(code, { sourceType: 'module' }), {
    Program(path) {
      p = path
      path.stop()
    },
  })
  return p!
}

export function matchCodeSnapshot(ast: File) {
  expect(generate(ast).code).toMatchSnapshot()
}

/* eslint-disable @typescript-eslint/no-empty-function */
export const NO_OP = () => {}

/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
export const NO_OP_HANDLER = (_: any) => {}

export async function withTempPath<T>(
  path: string,
  fn: (path: string) => T | Promise<T>
) {
  const tempDir = await mkdtemp(join(tmpdir(), 'macros-'))
  const result = await fn(join(tempDir, path))
  await rm(tempDir, {
    force: true,
    recursive: true,
  })
  return result
}

export async function withDevServer(fn: (server: ViteDevServer) => any) {
  const server = await createServer()
  await fn(server)
  await server.close()
}

export function mockMacro(
  name: string,
  fn: MacroHandler = NO_OP_HANDLER,
  meta: MacroMeta = {
    types: [],
    signatures: [],
  }
) {
  return macro(name, meta, fn)
}

export function mockRuntime(
  options?: Partial<RuntimeOptions>,
  defaultExports?: NormalizedExports
) {
  return new Runtime(
    {
      typeRenderer: options?.typeRenderer || {
        typesPath: '',
      },
      transformer: options?.transformer || {},
      filter: options?.filter || {},
    },
    defaultExports
  )
}

export function mockExports({
  types = {},
  macros = {},
  modules = {},
}: Partial<NormalizedExports> = {}): NormalizedExports {
  return {
    types,
    macros,
    modules,
  }
}

export const macroSerializer = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  serialize(val) {
    if (!isMacro(val)) throw new Error('not a macro')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return `Macro { "name": "${val.name}", "__types": "${val.__types}" }`
  },

  test(val) {
    return isMacro(val)
  },
} as jest.SnapshotSerializerPlugin
