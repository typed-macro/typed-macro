import {
  macroProvider,
  MacroProvider,
  MacroProviderHooks,
} from '@/macroProvider'
import { NamespacedExportable, normalizeExports } from '@/core/exports'
import { ParserPlugin } from '@babel/parser'

export type MacroProviderOptions = {
  /**
   * The id of provider.
   */
  id: string
  /**
   * Provider hooks.
   */
  hooks?: MacroProviderHooks
  /**
   * Exports macros so macros can be imported and called,
   * the value of the key will be the name of namespace(or called `module`).
   *
   * Also supports exporting modules (source codes),
   * but a namespace cannot export both module and macros.
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
   *        customTypes: `export const a:number`
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
  exports: NamespacedExportable
  /**
   * Provider options.
   */
  options?: {
    parserPlugins?: ParserPlugin[]
  }
}

function normalizeProvider(raw: MacroProviderOptions): MacroProvider {
  const { id, hooks = {}, exports, options = {} } = raw
  return {
    id,
    hooks,
    exports: normalizeExports(exports),
    options: {
      transformer: {
        parserPlugins: options.parserPlugins,
      },
    },
  }
}

/**
 * Define a macro provider.
 * @param options provider options.
 */
export function defineMacroProvider(
  options: MacroProviderOptions
): MacroProvider {
  return macroProvider(normalizeProvider(options))
}
