import { Plugin } from 'vite'
import { ParserPlugin } from '@babel/parser'
import { InternalPluginOptions, MacroPluginHooks, plugin } from '@/plugin'
import { MacroWithMeta } from '@/macro'

type Exportable = (
  | {
      /**
       * as macros
       */
      macros: MacroWithMeta[]
    }
  | {
      /**
       * as module, code will be used as source code of the module
       */
      code: string
    }
) & {
  /**
   * Type definitions, will be written to d.ts.
   *
   * e.g.
   * ```typescript
   * { exports: { '@macros': { customTypes: `type A = string` } } }
   * ```
   * will generate
   * ```typescript
   * declare module '@macros' {
   *   type A = string
   * }
   * ```
   */
  customTypes?: string
}

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
  exports: {
    [namespace: string]: Exportable
  }
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

function normalizeOption(raw: MacroPluginOptions): InternalPluginOptions {
  const {
    name,
    hooks = {},
    dtsPath,
    exports,
    maxRecursion,
    parserPlugins,
  } = raw
  const macros: InternalPluginOptions['macros'] = Object.create(null)
  const modules: InternalPluginOptions['modules'] = Object.create(null)
  const customTypes: InternalPluginOptions['customTypes'] = Object.create(null)
  Object.keys(exports).forEach((ns) => {
    const item = exports[ns]
    customTypes[ns] = {
      moduleScopeTypes: item.customTypes,
      macroScope: [],
    }
    if ('code' in item) {
      modules[ns] = item.code
    } else {
      macros[ns] = item.macros.map((m) => ({ name: m.name, apply: m.apply }))
      customTypes[ns].macroScope = item.macros.map((m) => ({
        name: m.name,
        meta: m.meta,
      }))
    }
  })
  return {
    name,
    dtsPath,
    modules,
    macros,
    customTypes,
    maxRecursion: maxRecursion && maxRecursion > 0 ? maxRecursion : 5,
    parserPlugins: ['typescript', 'jsx', ...(parserPlugins || [])],
    hooks,
  }
}

/**
 * Define the macro plugin. It can be used as vite plugin directly.
 * @param options plugin options.
 */
export function defineMacroPlugin(options: MacroPluginOptions): Plugin {
  return plugin(normalizeOption(options))
}
