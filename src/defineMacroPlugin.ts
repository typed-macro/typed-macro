import { Plugin } from 'vite'
import {
  InternalPluginOptions,
  macroPlugin,
  MacroPluginHooks,
} from '@/macroPlugin'
import { NamespacedExportable, normalizeExports } from '@/core/exports'
import { Runtime, RuntimeOptions } from '@/core/runtime'
import { FlatOptions } from '@/common'

export type MacroPluginOptions = FlatOptions<RuntimeOptions> & {
  /**
   * The name of plugin.
   */
  name: string
  /**
   * Plugin hooks.
   */
  hooks?: MacroPluginHooks
  /**
   * Exports macros or modules in different namespaces.
   * @see MacroProviderOptions.exports
   */
  exports: NamespacedExportable
}

function normalizeOption({
  name,
  hooks = {},
  exports,
  typesPath,
  maxRecursions,
  parserPlugins,
}: MacroPluginOptions): InternalPluginOptions {
  return {
    name,
    hooks,
    runtime: new Runtime(
      {
        transformer: { maxRecursions, parserPlugins },
        typeRenderer: { typesPath },
      },
      normalizeExports(exports)
    ),
  }
}

/**
 * Define a macro plugin.
 * @param options plugin options.
 * @return A vite plugin, can be used as rollup plugin as well.
 */
export function defineMacroPlugin(options: MacroPluginOptions): Plugin {
  return macroPlugin(normalizeOption(options))
}
