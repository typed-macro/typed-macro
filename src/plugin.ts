import type { Plugin, ViteDevServer } from 'vite'
import { readFile, writeFile } from 'fs/promises'
import { BabelTools, Macro } from './macro'
import { parse, ParserPlugin } from '@babel/parser'
import * as types from '@babel/types'
import {
  CallExpression,
  ImportDeclaration,
  isCallExpression,
  isIdentifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isMemberExpression,
  isStringLiteral,
  Node,
  File,
  Program,
} from '@babel/types'
import template from '@babel/template'
import traverse, { NodePath } from '@babel/traverse'
import { resolve } from 'path'
import { render } from 'mustache'
import generate from '@babel/generator'
import { ModuleNode } from 'vite'
import {
  getFilePathRelatedHelper,
  getProgramRelatedHelper,
  projectDir,
  run,
} from './helper'
import { findInSet } from './common'

export type MacroPluginOptions = {
  exports: {
    [namespace: string]: {
      macros: Macro[]
      // type definitions, will be written to d.ts
      customTypes?: string
    }
  }
  // path of the automatically generated type declaration file
  dtsPath: string
  // max recursion for applying macros,
  // default to 5
  maxRecursion?: number
  // babel plugins to be applied during parsing
  parserPlugins?: ParserPlugin[]
}

export type MacroPluginServerHelper = {
  // invalidate caches for macros of all namespaces or specific namespace,
  // only available in dev mode
  invalidateCache: (namespace?: string) => void
  // find modules that import macros, only available in dev mode
  findImporters: (namespace?: string) => Set<ModuleNode>
}

export type MacroPluginServerHook = (
  server: ViteDevServer,
  helpers: MacroPluginServerHelper
) => (() => void) | void | Promise<(() => void) | void>

export type MacroPlugin = MacroPluginOptions & {
  name: string
  hooks?: Omit<Plugin, 'name' | 'enforce' | 'apply' | 'configureServer'> & {
    configureServer?: MacroPluginServerHook
  }
}

type NamespacedMacros = { [namespace: string]: Macro[] }

type NamespacedCustomTypes = { [namespace: string]: string | undefined }

type NormalizedMacroPluginOptions = {
  dtsPath: string
  namespaces: string[]
  macros: NamespacedMacros
  maxRecursion: number
  parserPlugins: ParserPlugin[]
  customTypes: NamespacedCustomTypes
}

function normalizeOption(
  raw: MacroPluginOptions
): NormalizedMacroPluginOptions {
  const { dtsPath, exports, maxRecursion, parserPlugins } = raw
  const namespaces = Object.keys(exports)
  const macros = Object.create(null)
  const customTypes = Object.create(null)
  namespaces.forEach((ns) => {
    macros[ns] = exports[ns].macros
    customTypes[ns] = exports[ns].customTypes
  })
  return {
    dtsPath,
    namespaces,
    macros,
    customTypes,
    maxRecursion: maxRecursion && maxRecursion > 0 ? maxRecursion : 5,
    parserPlugins: ['typescript', 'jsx', ...(parserPlugins || [])],
  }
}

type MacroPluginContext = {
  dev: boolean
}

export function defineMacroPlugin(plugin: MacroPlugin): Plugin {
  const {
    name,
    hooks: {
      configResolved,
      configureServer,
      transform,
      load,
      resolveId,
      ...otherHooks
    } = {},
    ...options
  } = plugin

  const {
    dtsPath,
    namespaces,
    macros,
    maxRecursion,
    parserPlugins,
    customTypes,
  } = normalizeOption(options)

  throwErrorIfConflict(macros)

  const ctx: MacroPluginContext = {
    dev: false,
  }

  return {
    name,
    enforce: 'pre',
    configResolved(config) {
      if (config.env.DEV) ctx.dev = true
      generateDts(dtsPath, {
        namespaces,
        macros,
        customTypes: customTypes,
      }).then()
      // hook
      return configResolved?.(config)
    },
    resolveId(id, importer, options, ssr) {
      if (namespaces.includes(id)) return id
      // hook
      return resolveId?.bind(this)(id, importer, options, ssr)
    },
    load(id, ssr) {
      if (namespaces.includes(id)) return 'export {}'
      // hook
      return load?.bind(this)(id, ssr)
    },
    transform(code, id, ssr) {
      if (/\.[jt]sx?$/.test(id)) {
        const ast = parse(code, {
          sourceType: 'module',
          plugins: parserPlugins,
        })

        const collect = (container: Set<ImportedMacro>) =>
          collectImportedMacros(
            ast,
            namespaces,
            container,
            // Note: keep import statements in dev mode so can invalidate macro modules
            ctx.dev /* keep import stmt */
          )

        const importedMacros = collect(new Set())
        if (!importedMacros.size) return

        const applyCtx: ApplyContext = {
          code,
          filepath: id,
          ast,
          macros,
          importedMacros,
        }

        let loopCount = 0
        while (loopCount < maxRecursion) {
          const { applied, recollectMacros } = applyMacros(applyCtx)
          if (!applied) break
          if (recollectMacros) collect(applyCtx.importedMacros)

          loopCount++
          if (loopCount === maxRecursion)
            throw new Error(
              `Reached the maximum recursion, please check macros applied in file ${id}`
            )
        }

        return generate(ast, {
          retainLines: true,
        }).code
      }
      // hook
      return transform?.bind(this)(code, id, ssr)
    },
    configureServer(server) {
      // hook
      function findImporters(ns?: string) {
        const result = new Set<ModuleNode>()
        const moduleIDs = ns ? [ns] : namespaces
        moduleIDs.forEach((id) => {
          server.moduleGraph
            .getModuleById(`/@id/${id}`)
            ?.importers.forEach((m) => result.add(m))
        })
        return result
      }

      function invalidateCache(ns?: string) {
        findImporters(ns)?.forEach((m) =>
          server.moduleGraph.invalidateModule(m)
        )
      }

      configureServer?.(server, { findImporters, invalidateCache })
    },
    ...otherHooks,
  }
}

function throwErrorIfConflict(macros: NormalizedMacroPluginOptions['macros']) {
  Object.keys(macros).forEach((ns) => {
    const mem = Object.create(null)
    macros[ns].forEach((m) => {
      if (mem[m.name]) {
        throw new Error(
          `Error when loading macros: a macro with name '${m.name}' in '${ns}' already existed`
        )
      }
      mem[m.name] = 1
    })
  })
}

type ImportedMacro =
  | {
      importedAsNamespace: true
      namespace: string
      local: string
    }
  | {
      importedAsNamespace: false
      namespace: string
      local: string
      origin: string
    }

function collectImportedMacros(
  ast: Node,
  namespaces: string[],
  importedMacros: Set<ImportedMacro>,
  keepImportStmt = false
) {
  {
    const importPaths: NodePath<ImportDeclaration>[] = []
    traverse(ast, {
      Declaration(path) {
        if (!path.isImportDeclaration()) return
        if (!namespaces.includes(path.node.source.value)) return

        // import 'a'
        if (!path.node.specifiers.length) return

        path.node.specifiers.forEach((s) => {
          importedMacros.add(
            // import a from 'a' || import * as a from 'a'
            isImportDefaultSpecifier(s) || isImportNamespaceSpecifier(s)
              ? ({
                  importedAsNamespace: true,
                  namespace: path.node.source.value,
                  local: s.local.name,
                } as ImportedMacro)
              : // import { a as a } from 'a'
                ({
                  importedAsNamespace: false,
                  namespace: path.node.source.value,
                  local: s.local.name,
                  origin: isIdentifier(s.imported) && s.imported.name,
                } as ImportedMacro)
          )
        })
        importPaths.push(path)
      },
    })
    if (keepImportStmt) {
      importPaths.forEach((p) =>
        p.replaceWith(template.statement.ast(`import '${p.node.source.value}'`))
      )
    } else {
      importPaths.forEach((p) => p.remove())
    }
  }

  return importedMacros
}

async function generateDts(
  targetPath: string,
  {
    namespaces,
    macros,
    customTypes,
  }: Pick<NormalizedMacroPluginOptions, 'namespaces' | 'macros' | 'customTypes'>
) {
  await writeFile(
    targetPath,
    render(
      (await readFile(resolve(__dirname, './client.d.ts.tpl'))).toString(),
      {
        namespaces: namespaces.map((ns) => ({
          path: ns,
          macros: macros[ns].map((m) => ({
            macroTypes: m.meta.typeDefinitions,
            signature: m.meta.signatures,
            name: m.name,
          })),
          moduleTypes: customTypes[ns],
        })),
      }
    )
  )
}

// find macros to be applied, returns:
//
// - Macro: has origin
//
// - string: has origin name but no origin found
//
// - undefined: normal function call
function findMacroToApply(
  callee: CallExpression['callee'],
  importedMacros: Set<ImportedMacro>,
  macros: NamespacedMacros
) {
  if (isMemberExpression(callee)) {
    const ns = callee.object
    if (isIdentifier(ns)) {
      const maybeMacro = findInSet(
        importedMacros,
        (m) => m.importedAsNamespace && m.local === ns.name
      )
      if (!maybeMacro) return
      const method = callee.property
      if (isIdentifier(method)) {
        // namespace.method()
        return (
          macros[maybeMacro.namespace].find((m) => m.name === method.name) ||
          method.name
        )
      } else if (isStringLiteral(method)) {
        // namespace['method']()
        return (
          macros[maybeMacro.namespace].find((m) => m.name === method.value) ||
          method.value
        )
      }
    }
  } else if (isIdentifier(callee)) {
    // method()
    const maybeMacro = findInSet(
      importedMacros,
      (m) => !m.importedAsNamespace && m.local === callee.name
    )
    if (!maybeMacro) return
    return (
      macros[maybeMacro.namespace].find(
        (m) => m.name === (maybeMacro as { origin: string }).origin
      ) || callee.name
    )
  }
}

const BABEL_TOOLS: BabelTools = Object.freeze({
  template,
  traverse,
  types,
})

type ApplyContext = {
  code: string
  filepath: string
  ast: File

  importedMacros: Set<ImportedMacro>
  macros: NamespacedMacros
}

type ApplyResult = {
  applied: boolean
  recollectMacros: boolean
}

function applyMacros({
  code,
  filepath,
  ast,
  importedMacros,
  macros,
}: ApplyContext): ApplyResult {
  const result: ApplyResult = {
    applied: false,
    recollectMacros: false,
  }

  const forceRecollectMacros = () => (result.recollectMacros = true)
  const filePathRelatedHelper = getFilePathRelatedHelper(filepath)
  let programRelatedHelper: ReturnType<typeof getProgramRelatedHelper>

  traverse(ast, {
    Expression(path) {
      if (isCallExpression(path.node)) {
        const macroToApply = findMacroToApply(
          path.node.callee,
          importedMacros,
          macros
        )
        if (!macroToApply) return

        if (typeof macroToApply === 'string')
          throw new Error(`macro '${macroToApply}' not found in ${filepath}`)

        try {
          macroToApply.apply(
            {
              code,
              filepath,
              path,
              args: path.node.arguments,
            },
            BABEL_TOOLS,
            {
              run,
              projectDir,
              forceRecollectMacros,
              ...filePathRelatedHelper,
              ...(programRelatedHelper ||
                (programRelatedHelper = getProgramRelatedHelper(
                  path.findParent((p) => p.isProgram()) as NodePath<Program>
                ))),
            }
          )
        } catch (e) {
          throw new Error(
            `Error when apply macro ${macroToApply.name} in ${filepath}: ${e}`
          )
        } finally {
          result.applied = true
        }
      }
    },
  })

  return result
}
