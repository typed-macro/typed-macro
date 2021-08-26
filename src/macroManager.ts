import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import {
  isMacroProvider,
  MacroProvider,
  MacroProviderHooks,
} from '@/macroProvider'
import { findDuplicatedItem } from '@/common'
import {
  getTransformer,
  Transformer,
  TransformerOptions,
} from '@/runtime/transformer'
import { isMacroPlugin, MacroPlugin } from '@/macroPlugin'
import { MacroContainer } from '@/macroContainer'
import { getDevServerHelper } from '@/helper/server'

export class MacroManagerContext extends MacroContainer {
  config?: ResolvedConfig = undefined
  devServer?: ViteDevServer = undefined

  plugins: Plugin[] = []

  private hooks: MacroProviderHooks[] = []

  constructor(transformer: Transformer) {
    super(transformer)
  }

  get isDev() {
    return !!this.devServer
  }

  get isRollup() {
    return !!this.config
  }

  async callOnStartHooks() {
    if (this.isRollup)
      await Promise.all(this.hooks.map((h) => h.onRollupStart?.()))
    else
      await Promise.all(
        this.hooks.map((h) =>
          h.onViteStart?.(
            this.config!,
            this.devServer!,
            getDevServerHelper(this.devServer!)
          )
        )
      )
    await Promise.all(this.hooks.map((h) => h.onStart?.()))
  }

  addProvider(provider: MacroProvider) {
    {
      const duplicated = findDuplicatedItem(
        Object.keys(provider.types),
        Object.keys(this.types)
      )
      if (duplicated)
        throw new Error(
          `Error when use '${provider.id}': duplicated namespace '${duplicated}'.`
        )
    }
    {
      Object.keys(provider.macros).forEach((ns) => {
        const mem = Object.create(null)
        provider.macros[ns].forEach((m) => {
          if (mem[m.name]) {
            throw new Error(
              `Error when use '${provider.id}': a macro with name '${m.name}' in '${ns}' already existed`
            )
          }
          mem[m.name] = 1
        })
      })
    }
    Object.assign(this.macros, provider.macros)
    this.macrosNamespaces = Object.keys(this.macros)
    Object.assign(this.modules, provider.modules)
    this.modulesNamespaces = Object.keys(this.macros)
    Object.assign(this.types, provider.types)
    this.hooks.push(provider.hooks)
  }

  addPlugin(plugin: MacroPlugin) {
    const provider = plugin.__consume()
    this.addProvider(provider)
    this.plugins.push(plugin)
  }

  load(id: string) {
    return super.callLoad(id)
  }

  resolveId(id: string) {
    return super.callResolveId(id)
  }

  transform(code: string, id: string, ssr: boolean | undefined) {
    return super.callTransform({
      code,
      id,
      ssr,
      dev: this.isDev,
    })
  }
}

export type MacroManager = Plugin[] & {
  use: {
    (provider: MacroProvider): MacroManager
    (plugin: Plugin): MacroManager
  }
}

export type InternalMacroManagerOptions = TransformerOptions & {
  name: string
  dtsPath: string
}

interface InternalMacroManager extends MacroManager {
  __internal_macro_manager: true
}

export function macroManager(
  options: InternalMacroManagerOptions
): MacroManager {
  const { name, dtsPath, maxRecursion, parserPlugins } = options

  const context = new MacroManagerContext(
    getTransformer({
      maxRecursion,
      parserPlugins,
    })
  )

  const manager = context.plugins as MacroManager
  manager.push({
    name,
    enforce: 'pre',
    configResolved(config) {
      context.config = config
    },
    configureServer(server) {
      context.devServer = server
    },
    async buildStart() {
      await Promise.all([
        context.callOnStartHooks(),
        context.generateDts(dtsPath),
      ])
    },
    resolveId(id) {
      return context.resolveId(id)
    },
    load(id) {
      return context.load(id)
    },
    transform(code, id, ssr) {
      if (/\.[jt]sx?$/.test(id)) return context.transform(code, id, ssr)
    },
  })
  manager.use = (p) => {
    if (isMacroProvider(p)) context.addProvider(p)
    else if (isMacroPlugin(p)) context.addPlugin(p)
    else
      throw new Error(
        `Error when call use(): argument is neither a macro provider nor a macro plugin`
      )
    return manager
  }
  ;(manager as InternalMacroManager).__internal_macro_manager = true

  return manager
}
