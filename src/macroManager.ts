import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import {
  isMacroProvider,
  MacroProvider,
  MacroProviderHooks,
} from '@/macroProvider'
import { isMacroPlugin, macroPlugin, MacroPlugin } from '@/macroPlugin'
import { getDevServerHelper } from '@/helper/server'
import { Runtime } from '@/core/runtime'

/**
 * A manager/container of macros.
 */
export type MacroManager = {
  /**
   * Register {@link MacroProvider} or {@link MacroPlugin} to this macro manager so that
   * all macros in providers and plugins share the same runtime.
   *
   * For macro plugins:
   *  > Some options like `maxRecursions` or `typesPath` will be overridden by
   *  > manager's, `parserPlugins` will be merged with the manager's one.
   *  >
   *  > After registered, the original macro plugin will be attached to the manager,
   *  > which means no need to add the plugin to Vite/Rollup 's plugins array again.
   * @param sources macro providers or plugins.
   */
  use(...sources: (MacroProvider | Plugin)[]): MacroManager
  /**
   * Get a shallow copy of the underlying plugins of the macro manager.
   * In most cases, it can be used as one plugin directly since Vite flats
   * plugin array automatically.
   */
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
    sources.forEach((s) => this.add(s))
    return this
  }

  private add(p: MacroProvider | Plugin) {
    if (isMacroProvider(p)) this.addProvider(p)
    else if (isMacroPlugin(p)) this.addPlugin(p)
    else
      throw new Error(
        'the argument is neither a macro provider nor a macro plugin, ' +
          'please use defineMacroProvider() and defineMacroPlugin() to ' +
          'define providers and plugins.'
      )
  }

  private addProvider(provider: MacroProvider) {
    const { exports, options } = provider
    this.runtime.merge({ exports, options })
    this.hooks.push(provider.hooks)
  }

  private addPlugin(plugin: MacroPlugin) {
    const { exports, options } = plugin.__consume()
    this.runtime.merge({ exports, options })
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
