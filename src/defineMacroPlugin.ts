import { Plugin } from 'vite'
import { ParserPlugin } from '@babel/parser'
import {
  InternalPluginOptions,
  macroPlugin,
  MacroPluginHooks,
} from '@/macroPlugin'
import { NamespacedExportable, normalizeExports } from './exportable'

export type MacroPluginOptions = {
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
  /**
   * The path of the automatically generated type declaration file.
   */
  dtsPath: string
  /**
   * The max recursion for applying macros, default to 5.
   *
   * After reached the maxRecursion, plugin will throw out an error.
   *
   * It's usually caused by forgetting to remove the call expression
   * in macros.
   */
  maxRecursion?: number
  /**
   * Babel plugins to be applied during parsing.
   *
   * By default 'typescript' and 'jsx' are included and cannot be removed.
   */
  parserPlugins?: ParserPlugin[]
}

function normalizeOption({
  name,
  dtsPath,
  hooks = {},
  maxRecursion,
  parserPlugins,
  exports,
}: MacroPluginOptions): InternalPluginOptions {
  return {
    name,
    dtsPath,
    hooks,
    maxRecursion,
    parserPlugins,
    ...normalizeExports(exports),
  }
}

/**
 * Define the macro plugin. It can be used as vite plugin directly.
 * @param options plugin options.
 */
export function defineMacroPlugin(options: MacroPluginOptions): Plugin {
  return macroPlugin(normalizeOption(options))
}
