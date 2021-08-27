import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import {
  isMacroProvider,
  MacroProvider,
  MacroProviderHooks,
} from '@/macroProvider'
import { isMacroPlugin, MacroPlugin } from '@/macroPlugin'
import { getDevServerHelper } from '@/helper/server'
import { Runtime, RuntimeOptions } from '@/core'

export class MacroManagerContext {
  private config?: ResolvedConfig
  private devServer?: ViteDevServer

  plugins: Plugin[] = []

  private hooks: MacroProviderHooks[] = []

  constructor(private runtime: Runtime) {}

  private get isRollup() {
    return !!this.config
  }

  add(p: MacroProvider | Plugin) {
    if (isMacroProvider(p)) this.addProvider(p)
    else if (isMacroPlugin(p)) this.addPlugin(p)
    else
      throw new Error(`argument is neither a macro provider nor a macro plugin`)
  }

  private addProvider(provider: MacroProvider) {
    this.runtime.register(provider.exports)
    this.hooks.push(provider.hooks)
  }

  private addPlugin(plugin: MacroPlugin) {
    const provider = plugin.__consume()
    this.addProvider(provider)
    this.plugins.push(plugin)
  }

  async handleBuildStart() {
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
    // no need to await
    this.runtime.typeRenderer.write().then()
  }

  handleLoad(id: string) {
    return this.runtime.handleLoad(id)
  }

  handleResolveId(id: string) {
    return this.runtime.handleResolveId(id)
  }

  handleTransform(code: string, id: string, ssr = false) {
    return this.runtime.handleTransform(code, id, ssr)
  }

  handleConfigureServer(server: ViteDevServer) {
    this.devServer = server
    this.runtime.setDevMode()
  }

  handleConfigResolved(config: ResolvedConfig) {
    this.config = config
    this.runtime.setDevMode()
  }
}

export type MacroManager = Plugin[] & {
  use: (...sources: (MacroProvider | Plugin)[]) => MacroManager
}

export type InternalMacroManagerOptions = {
  name: string
  runtimeOptions: RuntimeOptions
}

interface InternalMacroManager extends MacroManager {
  __internal_macro_manager: true
}

export function macroManager(
  options: InternalMacroManagerOptions
): MacroManager {
  const { name, runtimeOptions } = options

  const context = new MacroManagerContext(new Runtime(runtimeOptions))

  const manager = context.plugins as MacroManager
  manager.push({
    name,
    enforce: 'pre',
    configResolved(config) {
      context.handleConfigResolved(config)
    },
    configureServer(server) {
      context.handleConfigureServer(server)
    },
    async buildStart() {
      await context.handleBuildStart()
    },
    resolveId(id) {
      return context.handleResolveId(id)
    },
    load(id) {
      return context.handleLoad(id)
    },
    transform(code, id, ssr) {
      return context.handleTransform(code, id, ssr)
    },
  })
  manager.use = (...sources) => {
    try {
      sources.forEach((s) => context.add(s))
    } catch (e) {
      throw new Error(`Error when use provider/plugin: ${e.message || e}`)
    }
    return manager
  }
  ;(manager as InternalMacroManager).__internal_macro_manager = true

  return manager
}
