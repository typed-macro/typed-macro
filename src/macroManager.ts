import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import {
  isMacroProvider,
  MacroProvider,
  MacroProviderHooks,
} from '@/macroProvider'
import { TransformerOptions } from '@/runtime/transformer'
import { isMacroPlugin, MacroPlugin } from '@/macroPlugin'
import { getDevServerHelper } from '@/helper/server'
import { Runtime } from '@/runtime'

type MacroManagerContextOptions = {
  transformer: TransformerOptions
  dtsPath: string
}

export class MacroManagerContext {
  private config?: ResolvedConfig = undefined
  private devServer?: ViteDevServer = undefined

  plugins: Plugin[] = []

  private hooks: MacroProviderHooks[] = []

  private runtime: Runtime
  private dtsPath: string

  constructor({ transformer, dtsPath }: MacroManagerContextOptions) {
    this.runtime = new Runtime({ transformer })
    this.dtsPath = dtsPath
  }

  get isRollup() {
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
    this.runtime.generateDts(this.dtsPath).then()
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
  use: {
    (provider: MacroProvider): MacroManager
    (plugin: Plugin): MacroManager
  }
}

export type InternalMacroManagerOptions = MacroManagerContextOptions & {
  name: string
}

interface InternalMacroManager extends MacroManager {
  __internal_macro_manager: true
}

export function macroManager(
  options: InternalMacroManagerOptions
): MacroManager {
  const { name, dtsPath, transformer } = options

  const context = new MacroManagerContext({
    transformer,
    dtsPath,
  })

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
  manager.use = (p) => {
    try {
      context.add(p)
    } catch (e) {
      throw new Error(`Error when use provider/plugin: ${e.message || e}`)
    }
    return manager
  }
  ;(manager as InternalMacroManager).__internal_macro_manager = true

  return manager
}
