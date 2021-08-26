import type { Plugin, ViteDevServer } from 'vite'
import { TransformerOptions } from '@/runtime/transformer'
import { NormalizedExports } from '@/runtime/types'
import { MacroProvider } from '@/macroProvider'
import { DevServerHelper, getDevServerHelper } from '@/helper/server'
import { Runtime } from '@/runtime'

export type MacroPluginHooks = Omit<
  Plugin,
  'name' | 'enforce' | 'apply' | 'configureServer'
> & {
  configureServer?: (
    server: ViteDevServer,
    helpers: DevServerHelper
  ) => (() => void) | void | Promise<(() => void) | void>
}

export type InternalPluginOptions = {
  name: string
  dtsPath: string
  transformer: TransformerOptions
  exports: NormalizedExports
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
    exports,
    transformer,
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

  let runtime: Runtime | undefined = new Runtime({ transformer })

  runtime.register(exports)

  return {
    __internal_macro_plugin: true,
    __consume() {
      if (!runtime) throw new Error(`plugin '${name}' is used more than once.`)
      const provider: MacroProvider = {
        id: name,
        exports: runtime.container,
        hooks: {},
      }
      runtime = undefined
      return provider
    },
    name,
    enforce: 'pre',
    buildStart(opt) {
      runtime?.generateDts(dtsPath).then()
      // hook
      return buildStart?.bind(this)(opt)
    },
    configResolved(config) {
      runtime?.setDevMode(config.env.DEV)
      // hook
      return configResolved?.(config)
    },
    resolveId(id, importer, options, ssr) {
      const result = runtime?.handleResolveId(id)
      if (result) return result
      // hook
      return resolveId?.bind(this)(id, importer, options, ssr)
    },
    load(id, ssr) {
      const result = runtime?.handleLoad(id)
      if (result) return result
      // hook
      return load?.bind(this)(id, ssr)
    },
    transform(code, id, ssr) {
      const transformed = runtime?.handleTransform(code, id, ssr)
      if (transformed !== undefined)
        return transform
          ? transform.bind(this)(transformed, id, ssr)
          : transformed
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
