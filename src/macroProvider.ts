import { NormalizedExports } from '@/core/exports'
import { ResolvedConfig, ViteDevServer } from 'vite'
import { DevServerHelper } from '@/helper/server'
import { RuntimeOptions } from '@/core/runtime'

export type MacroProviderHooks = {
  /**
   * A startup hook called only if running in Vite.
   */
  onViteStart?: (
    config: ResolvedConfig,
    server: ViteDevServer,
    helper: DevServerHelper
  ) => void | Promise<void>
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
  options: Pick<RuntimeOptions, 'transformer'>
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
