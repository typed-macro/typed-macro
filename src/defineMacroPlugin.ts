import { Plugin } from 'vite'
import {
  InternalPluginOptions,
  macroPlugin,
  MacroPluginHooks,
} from '@/macroPlugin'
import { NamespacedExportable, normalizeExports } from '@/core/types'
import { FlatOptions } from '@/common'

export type MacroPluginOptions = FlatOptions<
  InternalPluginOptions['runtimeOptions']
> & {
  /**
   * The name of plugin.
   */
  name: string
  /**
   * Vite plugin hooks.
   */
  hooks?: MacroPluginHooks
  /**
   * Exports macros so macros can be imported and called,
   * the value of the key will be the name of namespace(or called module).
   *
   * e.g.
   * ```typescript
   * const macroA = defineMacro('macroA')
   *   .withSignature('(...args: any[]): void')
   *   .withHandler(()=>...)
   *
   * { exports: {'@macros': {macros: [macroA]}} }
   * ```
   * Then in some .js(x) or .ts(x) file you can
   * ```typescript
   * import { macroA } from '@macros'
   * macroA(someArgs)
   * ```
   */
  exports: NamespacedExportable
}

function normalizeOption({
  name,
  hooks = {},
  exports,
  typesPath,
  maxRecursion,
  parserPlugins,
}: MacroPluginOptions): InternalPluginOptions {
  return {
    name,
    hooks,
    exports: normalizeExports(exports),
    runtimeOptions: {
      transformer: { maxRecursion, parserPlugins },
      typeRenderer: { typesPath },
    },
  }
}

/**
 * Define the macro plugin. It can be used as vite plugin directly.
 * @param options plugin options.
 */
export function defineMacroPlugin(options: MacroPluginOptions): Plugin {
  return macroPlugin(normalizeOption(options))
}
