import {
  macroProvider,
  MacroProvider,
  MacroProviderHooks,
} from '@/macroProvider'
import { NamespacedExportable, normalizeExports } from '@/exportable'

export type MacroProviderOptions = {
  id: string
  hooks?: MacroProviderHooks
  exports: NamespacedExportable
}

function normalizeProvider(raw: MacroProviderOptions): MacroProvider {
  const { id, hooks = {}, exports } = raw
  return {
    id,
    hooks,
    ...normalizeExports(exports),
  }
}

export function defineMacroProvider(
  options: MacroProviderOptions
): MacroProvider {
  return macroProvider(normalizeProvider(options))
}
