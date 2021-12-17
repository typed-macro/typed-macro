import { ModularizedExportable } from '../exports'
import { MacroProviderHooks } from './hooks'
import { VERSION } from '@typed-macro/shared'
import { MacroProviderOptions } from './options'
import { EnvContext } from '../env'

export type InstantiatedMacroProvider = {
  id: string
  /**
   * Exports macros so macros can be imported and called,
   * the key will be the name of the virtual module.
   *
   * Also supports exporting source codes,
   * but a module cannot export both codes and macros.
   *
   * e.g.
   * ```typescript
   * const macroA = defineMacro('macroA')
   *   .withSignature('(...args: any[]): void')
   *   .withHandler(()=>...)
   *
   * {
   *   exports: {
   *     '@macros': { macros: [macroA] },
   *     '@helper': {
   *        code: `export const a = 1`,
   *        types: `export const a:number`
   *      }
   *    },
   *  }
   * ```
   * Then in some .js(x) or .ts(x) file you can
   * ```typescript
   * import { macroA } from '@macros'
   * import { a } from '@helper'
   * macroA(someArgs)
   * console.log(a)
   * ```
   */
  exports: ModularizedExportable
  /**
   * Provider hooks.
   */
  hooks?: MacroProviderHooks
  /**
   * Provider options.
   */
  options?: MacroProviderOptions
}

export type MacroProvider = {
  /**
   * @internal
   */
  __is_macro_provider?: boolean
  /**
   * @internal
   */
  version?: string
} & (
  | InstantiatedMacroProvider
  | ((env: EnvContext) => InstantiatedMacroProvider)
)

export function isMacroProvider(o: unknown): o is MacroProvider {
  return (o as MacroProvider)?.__is_macro_provider ?? false
}

export function macroProvider(provider: MacroProvider): MacroProvider {
  provider.__is_macro_provider = true
  provider.version = VERSION
  return provider
}
