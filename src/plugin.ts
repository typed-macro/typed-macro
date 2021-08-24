import type { Plugin, ViteDevServer } from 'vite'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import { render } from 'mustache'
import { getProcessor, NamespacedMacros } from '@/processor'
import { MacroMeta } from '@/macro'
import { ParserPlugin } from '@babel/parser'
import { DevServerHelper, getDevServerHelper } from '@/helper'

export type MacroPluginHooks = Omit<
  Plugin,
  'name' | 'enforce' | 'apply' | 'configureServer'
> & {
  configureServer?: (
    server: ViteDevServer,
    helpers: DevServerHelper
  ) => (() => void) | void | Promise<(() => void) | void>
}

export type CustomTypes = {
  [namespace: string]: {
    moduleScopeTypes?: string
    macroScope: {
      name: string
      meta: MacroMeta
    }[]
  }
}

type NamespacedModules = {
  [namespace: string]: string
}

export type InternalPluginOptions = {
  name: string
  dtsPath: string

  macros: NamespacedMacros
  modules: NamespacedModules

  maxRecursion: number
  parserPlugins: ParserPlugin[]

  customTypes: CustomTypes

  hooks: MacroPluginHooks
}

export function plugin(options: InternalPluginOptions): Plugin {
  const {
    name,
    dtsPath,
    modules,
    macros,
    maxRecursion,
    parserPlugins,
    customTypes,
    hooks: {
      configResolved,
      configureServer,
      transform,
      load,
      resolveId,
      ...otherHooks
    },
  } = options

  const macroNamespaces = Object.keys(macros)
  const moduleNamespaces = Object.keys(modules)

  let devMode = false

  const process = getProcessor({
    parserPlugins,
    macros,
    maxRecursion,
  })

  return {
    name,
    enforce: 'pre',
    configResolved(config) {
      if (config.env.DEV) devMode = true
      generateDts(dtsPath, customTypes).then()
      // hook
      return configResolved?.(config)
    },
    resolveId(id, importer, options, ssr) {
      if (macroNamespaces.includes(id)) return id
      if (moduleNamespaces.includes(id)) return id
      // hook
      return resolveId?.bind(this)(id, importer, options, ssr)
    },
    load(id, ssr) {
      if (macroNamespaces.includes(id)) return 'export {}'
      if (moduleNamespaces.includes(id)) return modules[id]
      // hook
      return load?.bind(this)(id, ssr)
    },
    transform(code, id, ssr) {
      if (/\.[jt]sx?$/.test(id)) {
        const transformed = process(code, id, devMode)
        if (transformed !== undefined)
          return transform
            ? transform.bind(this)(transformed, id, ssr)
            : transformed
      }
      // hook
      return transform?.bind(this)(code, id, ssr)
    },
    configureServer(server) {
      if (configureServer) configureServer(server, getDevServerHelper(server))
    },
    ...otherHooks,
  }
}

async function generateDts(targetPath: string, customTypes: CustomTypes) {
  await mkdir(dirname(targetPath), { recursive: true })
  await writeFile(targetPath, await renderTypes(customTypes))
}

export async function renderTypes(customTypes: CustomTypes) {
  const namespaces = Object.keys(customTypes)
  return render(
    (await readFile(resolve(__dirname, './client.d.ts.tpl'))).toString(),
    {
      namespaces: namespaces.map((ns) => ({
        module: ns,
        macros: customTypes[ns].macroScope.map((m) => ({
          macroScopeTypes: m.meta.types,
          signature: m.meta.signatures,
          name: m.name,
        })),
        moduleScopeTypes: customTypes[ns].moduleScopeTypes,
      })),
    }
  )
}
