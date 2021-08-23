import type { Plugin, ViteDevServer } from 'vite'
import { ModuleNode } from 'vite'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { BabelTools, Macro } from './macro'
import { parse, ParserPlugin, parseExpression } from '@babel/parser'
import * as types from '@babel/types'
import {
  CallExpression,
  File,
  ImportDeclaration,
  isCallExpression,
  isIdentifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isMemberExpression,
  isStringLiteral,
  Node,
} from '@babel/types'
import template from '@babel/template'
import traverse, { NodePath } from '@babel/traverse'
import { dirname, resolve } from 'path'
import { render } from 'mustache'
import generate from '@babel/generator'
import { getHelper } from './helper'
import { findInSet } from './common'

export type MacroPluginOptions = {
  /**
   * Exports macros so macros can be imported and called,
   * the value of the key will be the name of namespace(or called module).
   *
   * e.g.
   * ```typescript
   * const macroA = defineMacro('macroA')
   *   .withSignature('(...args: any[]): void')
   *   .withHandler(()=>...)
   *
   * { exports: {'@macros': {macros: [macroA]}} }
   * ```
   * Then in some .js(x) or .ts(x) file you can
   * ```typescript
   * import { macroA } from '@macros'
   * macroA(someArgs)
   * ```
   */
  exports: {
    [namespace: string]: {
      macros: Macro[]
      /**
       * Type definitions, will be written to d.ts.
       *
       * e.g.
       * ```typescript
       * { exports: { '@macros': { customTypes: `type A = string` } } }
       * ```
       * will generate
       * ```typescript
       * declare module '@macros' {
       *   type A = string
       * }
       * ```
       */
      customTypes?: string
    }
  }
  /**
   * The path of the automatically generated type declaration file.
   */
  dtsPath: string
  /**
   * The max recursion for applying macros, default to 5.
   *
   * After reached the maxRecursion, plugin will throw out an error.
   *
   * It's usually caused by forgetting to remove the call expression
   * in macros.
   */
  maxRecursion?: number
  /**
   * Babel plugins to be applied during parsing.
   *
   * By default 'typescript' and 'jsx' are included and cannot be removed.
   */
  parserPlugins?: ParserPlugin[]
}

export type MacroPluginServerHelper = {
  /**
   * Invalidate caches of modules that import macros
   * from all namespaces or specific namespace,
   * only available in dev mode.
   *
   * This is usually used when, the macro needs to be re-expanded due to
   * the change of external conditions, while the modules that call
   * the macro cannot be automatically reloaded because their dependencies
   * in the module dependency graph have no change so Vite always caches them.
   */
  invalidateCache: (namespace?: string) => void
  /**
   * Find modules that import macros from all namespaces or specific namespace,
   * only available in dev mode.
   */
  findImporters: (namespace?: string) => Set<ModuleNode>
}

export type MacroPluginServerHook = (
  server: ViteDevServer,
  helpers: MacroPluginServerHelper
) => (() => void) | void | Promise<(() => void) | void>

export type MacroPlugin = MacroPluginOptions & {
  /**
   * The name of plugin.
   */
  name: string
  /**
   * Vite plugin options.
   */
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

/**
 * Define the macro plugin. It can be used as vite plugin directly.
 * @param plugin plugin options.
 */
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

        const importedMacros = getImportedMacros(
          ast,
          namespaces,
          // Note: keep import statements in dev mode so can invalidate macro modules
          ctx.dev /* keep import stmt */
        )

        if (!importedMacros.collect().size) return

        const applyCtx: ApplyContext = {
          code,
          filepath: id,
          ast,
          macroFinder: getMacroFinder(importedMacros, macros),
        }

        let loopCount = 0
        while (loopCount < maxRecursion) {
          const { applied, recollectMacros } = applyMacros(applyCtx)
          if (!applied) break
          if (recollectMacros) importedMacros.collect()

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

type ImportedMacrosCollector = Set<ImportedMacro> & {
  collect: () => ImportedMacrosCollector
}

function getImportedMacros(
  ast: Node,
  namespaces: string[],
  keepImportStmt = false
): ImportedMacrosCollector {
  const importedMacros: ImportedMacrosCollector = new Set() as any

  importedMacros.collect = () => {
    {
      const importPaths: NodePath<ImportDeclaration>[] = []
      traverse(ast, {
        Declaration(path) {
          if (!path.isImportDeclaration()) return
          if (!namespaces.includes(path.node.source.value)) return

          // case - import 'a'
          if (!path.node.specifiers.length) return

          path.node.specifiers.forEach((s) => {
            importedMacros.add(
              // case - import a from 'a'
              // or
              // case - import * as a from 'a'
              isImportDefaultSpecifier(s) || isImportNamespaceSpecifier(s)
                ? {
                    importedAsNamespace: true,
                    namespace: path.node.source.value,
                    local: s.local.name,
                  }
                : // case - import { a as a } from 'a'
                  {
                    importedAsNamespace: false,
                    namespace: path.node.source.value,
                    local: s.local.name,
                    // imported !== existed
                    origin: isIdentifier(s.imported)
                      ? s.imported.name
                      : s.imported.value,
                  }
            )
          })
          importPaths.push(path)
        },
      })
      if (keepImportStmt) {
        importPaths.forEach((p) =>
          p.replaceWith(
            template.statement.ast(`import '${p.node.source.value}'`)
          )
        )
      } else {
        importPaths.forEach((p) => p.remove())
      }
    }
    return importedMacros
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
  await mkdir(dirname(targetPath), { recursive: true })
  await writeFile(
    targetPath,
    render(
      (await readFile(resolve(__dirname, './client.d.ts.tpl'))).toString(),
      {
        namespaces: namespaces.map((ns) => ({
          module: ns,
          macros: macros[ns].map((m) => ({
            macroScopeTypes: m.meta.typeDefinitions,
            signature: m.meta.signatures,
            name: m.name,
          })),
          moduleScopeTypes: customTypes[ns],
        })),
      }
    )
  )
}

// find macros to be applied from call expr, returns a
// - Macro: has origin
// - string: has origin name but no origin macro found
// - undefined: no origin name found
type MacroFinder = (
  callee: CallExpression['callee']
) => Macro | string | undefined

function getMacroFinder(
  importedMacros: Set<ImportedMacro>,
  macros: NamespacedMacros
): MacroFinder {
  return (callee) => {
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
          // case - namespace.method()
          return (
            macros[maybeMacro.namespace].find((m) => m.name === method.name) ||
            method.name
          )
        } else if (isStringLiteral(method)) {
          // case - namespace['method']()
          return (
            macros[maybeMacro.namespace].find((m) => m.name === method.value) ||
            method.value
          )
        }
      }
    } else if (isIdentifier(callee)) {
      // case - method()
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
}

const BABEL_TOOLS: BabelTools = Object.freeze({
  template,
  traverse,
  types,
  parse,
  parseExpression,
})

type ApplyContext = {
  code: string
  filepath: string
  ast: File

  macroFinder: MacroFinder
}

type ApplyResult = {
  applied: boolean
  recollectMacros: boolean
}

function applyMacros({
  code,
  filepath,
  ast,
  macroFinder,
}: ApplyContext): ApplyResult {
  const result: ApplyResult = {
    applied: false,
    recollectMacros: false,
  }

  const helper = Object.freeze({
    forceRecollectMacros: () => (result.recollectMacros = true),
    ...getHelper(filepath, ast),
  })

  traverse(ast, {
    Expression(path) {
      if (isCallExpression(path.node)) {
        const macroToApply = macroFinder(path.node.callee)
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
            helper
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
