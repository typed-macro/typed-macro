import type { Plugin, ViteDevServer } from 'vite'
import { getTransformer, TransformerOptions } from '@/runtime/transformer'
import {
  NamespacedMacros,
  NamespacedModules,
  NamespacedTypes,
} from '@/runtime/types'
import { MacroProvider } from '@/macroProvider'
import { MacroContainer } from '@/macroContainer'
import { DevServerHelper, getDevServerHelper } from '@/helper/server'

export type MacroPluginHooks = Omit<
  Plugin,
  'name' | 'enforce' | 'apply' | 'configureServer'
> & {
  configureServer?: (
    server: ViteDevServer,
    helpers: DevServerHelper
  ) => (() => void) | void | Promise<(() => void) | void>
}

export type InternalPluginOptions = TransformerOptions & {
  name: string
  dtsPath: string

  macros: NamespacedMacros
  modules: NamespacedModules

  types: NamespacedTypes

  hooks: MacroPluginHooks
}

export interface MacroPlugin extends Plugin {
  __consume: () => MacroProvider
}

interface InternalMacroPlugin extends MacroPlugin {
  __internal_macro_plugin: true
}

export function macroPlugin(options: InternalPluginOptions): MacroPlugin {
  const {
    name,
    dtsPath,
    modules,
    macros,
    maxRecursion,
    parserPlugins,
    types,
    hooks: {
      buildStart,
      configResolved,
      configureServer,
      transform,
      load,
      resolveId,
      ...otherHooks
    },
  } = options

  let devMode = false
  let container: MacroContainer | undefined = new MacroContainer(
    getTransformer({
      parserPlugins,
      maxRecursion,
    })
  )
  container.add(macros, modules, types)

  return {
    __internal_macro_plugin: true,
    __consume() {
      container = undefined
      return { id: name, macros, modules, types, hooks: {} } as MacroProvider
    },
    name,
    enforce: 'pre',
    buildStart(opt) {
      container?.generateDts(dtsPath).then()
      // hook
      return buildStart?.bind(this)(opt)
    },
    configResolved(config) {
      if (config.env.DEV) devMode = true
      // hook
      return configResolved?.(config)
    },
    resolveId(id, importer, options, ssr) {
      const result = container?.callResolveId(id)
      if (result) return result
      // hook
      return resolveId?.bind(this)(id, importer, options, ssr)
    },
    load(id, ssr) {
      const result = container?.callLoad(id)
      if (result) return result
      // hook
      return load?.bind(this)(id, ssr)
    },
    transform(code, id, ssr) {
      if (container && /\.[jt]sx?$/.test(id)) {
        const transformed = container.callTransform({
          code,
          id,
          ssr,
          dev: devMode,
        })
        if (transformed !== undefined)
          return transform
            ? transform.bind(this)(transformed, id, ssr)
            : transformed
      }
      // hook
      return transform?.bind(this)(code, id, ssr)
    },
    configureServer(server) {
      // hook
      if (configureServer) configureServer(server, getDevServerHelper(server))
    },
    ...otherHooks,
  } as InternalMacroPlugin
}

export function isMacroPlugin(o: unknown): o is MacroPlugin {
  return (o as any).__internal_macro_plugin
}
