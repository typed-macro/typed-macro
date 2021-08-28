import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import {
  isMacroProvider,
  MacroProvider,
  MacroProviderHooks,
} from '@/macroProvider'
import { isMacroPlugin, macroPlugin, MacroPlugin } from '@/macroPlugin'
import { getDevServerHelper } from '@/helper/server'
import { Runtime } from '@/core/runtime'

export type MacroManager = {
  use(...sources: (MacroProvider | Plugin)[]): MacroManager
  toPlugin(): Plugin[]
}

export type InternalMacroManagerOptions = {
  name: string
  runtime: Runtime
}

export function macroManager(
  options: InternalMacroManagerOptions
): MacroManager {
  const { name, runtime } = options

  return new MacroManagerImpl(name, runtime)
}

class MacroManagerImpl {
  private config?: ResolvedConfig
  private devServer?: ViteDevServer

  private plugins: Plugin[] = []

  private hooks: MacroProviderHooks[] = []

  constructor(name: string, private runtime: Runtime) {
    this.plugins.push(
      macroPlugin({
        name,
        runtime,
        hooks: {
          configResolved: (config) => this.handleConfigResolved(config),
          configureServer: (server) => this.handleConfigureServer(server),
          buildStart: () => this.handleBuildStart(),
        },
      })
    )
  }

  toPlugin() {
    return this.plugins.slice()
  }

  private get isRollup() {
    return !this.config
  }

  use(...sources: (MacroProvider | Plugin)[]) {
    try {
      sources.forEach((s) => this.add(s))
    } catch (e) {
      throw new Error(`Error when use provider/plugin: ${e.message || e}`)
    }
    return this
  }

  private add(p: MacroProvider | Plugin) {
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
