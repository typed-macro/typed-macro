import {
  NamespacedModules,
  NamespacedMacros,
  NamespacedTypes,
} from '@/runtime/types'
import { ResolvedConfig, ViteDevServer } from 'vite'
import { DevServerHelper } from '@/helper/server'

export type MacroProviderHooks = {
  onViteStart?: (
    config: ResolvedConfig,
    server: ViteDevServer,
    helper: DevServerHelper
  ) => void | Promise<void>
  onRollupStart?: () => void | Promise<void>
  onStart?: () => void | Promise<void>
}

export type MacroProvider = {
  id: string
  macros: NamespacedMacros
  modules: NamespacedModules
  types: NamespacedTypes
  hooks: MacroProviderHooks
}

interface InternalMacroProvider extends MacroProvider {
  __internal_macro_provider: true
}

export function isMacroProvider(o: unknown): o is MacroProvider {
  return (o as any).__internal_macro_provider
}

export function macroProvider(provider: MacroProvider): MacroProvider {
  ;(provider as InternalMacroProvider).__internal_macro_provider = true
  return provider
}
