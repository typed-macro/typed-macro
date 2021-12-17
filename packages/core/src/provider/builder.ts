import { macroProvider, MacroProvider } from './provider'

/**
 * Define a macro provider.
 */
export function defineMacroProvider(raw: MacroProvider): MacroProvider {
  return macroProvider(raw)
}
