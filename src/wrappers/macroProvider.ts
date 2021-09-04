import { NormalizedExports } from '@/core/exports'
import { ResolvedConfig, ViteDevServer } from 'vite'
import { DevServerHelper } from '@/wrappers/helper/server'
import { RuntimeOptions } from '@/core/runtime'

export type ViteStartContext = (
  | {
      /**
       * Is in dev mode.
       */
      dev: true
      /**
       * Vite dev server.
       */
      server: ViteDevServer
      /**
       * Wrappers on vite dev server.
       */
      helper: DevServerHelper
    }
  | {
      /**
       * Is in dev mode.
       */
      dev: false
    }
) & {
  /**
   * Vite resolved config.
   */
  config: ResolvedConfig
}

export type MacroProviderHooks = {
  /**
   * A startup hook called only if running in Vite.
   */
  onViteStart?: (ctx: ViteStartContext) => void | Promise<void>
  /**
   * A startup hook called only if running in Rollup.
   */
  onRollupStart?: () => void | Promise<void>
  /**
   * A startup hook, called immediately after {@link onViteStart}/{@link onRollupStart}.
   */
  onStart?: () => void | Promise<void>
}

export type MacroProvider = {
  id: string
  exports: NormalizedExports
  hooks: MacroProviderHooks
  options?: Partial<Pick<RuntimeOptions, 'transformer'>>
}

interface InternalMacroProvider extends MacroProvider {
  __internal_macro_provider: true
}

export function isMacroProvider(o: unknown): o is MacroProvider {
  return (o as any)?.__internal_macro_provider ?? false
}

export function macroProvider(provider: MacroProvider): MacroProvider {
  ;(provider as InternalMacroProvider).__internal_macro_provider = true
  return provider
}
