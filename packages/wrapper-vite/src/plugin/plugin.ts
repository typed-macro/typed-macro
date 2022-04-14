import { Plugin } from 'vite'
import { MacroProvider } from '@typed-macro/core'
import {
  createRuntime,
  FilterOptions,
  Runtime,
  TransformerOptions,
} from '@typed-macro/runtime'
import { createEnvContext } from './impl/env'
import { InternalModules } from './impl/modules'
import { join } from 'path'
import { WatchOptions } from 'chokidar'

export type MacroPlugin = Plugin & {
  /**
   * Register macro providers to this macro manager so that
   * all macros in providers and plugins share the same runtime.
   *
   * For macro plugins:
   *  > Some options like `maxTraversals` or `typesPath` will be overridden by
   *  > manager's, `parserPlugins` will be merged with the manager's one.
   *  >
   *  > After registered, the original macro plugin will be attached to the manager,
   *  > which means no need to add the plugin to Vite/Rollup 's plugins array again.
   * @param sources macro providers or plugins.
   */
  use(...sources: MacroProvider[]): MacroPlugin
}

export type MacroPluginOptions = FilterOptions &
  TransformerOptions & {
    /**
     * The path of the automatically generated type declaration file.
     *
     * @default '<projectDir>/macros.d.ts'
     */
    typesPath?: string

    /**
     * Is in dev mode.
     *
     * @default mode !== 'production'
     * @see https://vitejs.dev/guide/env-and-mode.html#modes
     */
    dev?: boolean

    /**
     * Is in SSR mode.
     *
     * @default whether there is an SSR configuration
     * @see https://vitejs.dev/guide/ssr.html
     */
    ssr?: boolean

    /**
     * Configure chokidar FSWatcher.
     *
     * @see https://github.com/paulmillr/chokidar#api
     */
    watcherOptions?: WatchOptions
  
    /**
     * Adjust the application order.
     *
     * @see https://vitejs.dev/guide/api-plugin.html#plugin-ordering
     * @default 'pre'
     */
    enforce?: 'pre' | 'post' | undefined
  }

/**
 * Create macro plugin.
 *
 * For example,
 * ```typescript
 * // vite.config.ts
 *
 * export default defineConfig({
 *   plugins: [
 *     createMacroPlugin({ ... })
 *       .use(provideSomeMacros({ ... }))
 *   ],
 * })
 * ```
 */
export function createMacroPlugin(
  /* istanbul ignore next */
  options: MacroPluginOptions = {}
): MacroPlugin {
  const {
    exclude,
    include,
    maxTraversals,
    typesPath,
    dev,
    ssr,
    watcherOptions,
    parserPlugins,
    enforce,
  } = options

  const uninstantiatedProviders: MacroProvider[] = []

  let runtime: Runtime | undefined

  const plugin: MacroPlugin = {
    use(...sources) {
      uninstantiatedProviders.push(...sources)
      return plugin
    },
    name: 'vite-plugin-macro',
    enforce: options.hasOwnProperty('enforce') ? enforce : 'pre',
    configResolved: async (config) => {
      // create env
      const env = createEnvContext(
        dev ?? !config.isProduction,
        ssr ?? !!config.build.ssr,
        watcherOptions
      )

      // init runtime
      runtime = createRuntime(env, {
        filter: { exclude, include },
        transformer: { maxTraversals, parserPlugins },
      })

      // add providers
      uninstantiatedProviders.forEach((provider) => {
        runtime!.appendProvider(provider)
      })

      // call onStart hook and render types
      await Promise.all([
        runtime!.start(),
        runtime!.renderTypes(
          /* istanbul ignore next */
          typesPath || join(env.projectPath[0], 'macros.d.ts')
        ),
      ])
    },
    configureServer: async (server) => {
      ;(runtime!.internal.env.modules as InternalModules).__setServer(server)
    },
    resolveId: (id) => runtime?.resolveId(id),
    load: (id) => runtime?.load(id),
    transform: async (code, id) => {
      if (!(await runtime?.filter(id))) return
      const result = await runtime?.transform(code, id)
      return result && { code: result, map: null }
    },
    buildEnd: async () => {
      await runtime!.stop()
    },
  }

  return plugin
}
