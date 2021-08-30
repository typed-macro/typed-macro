export * from './defineMacro'
export * from './defineMacroPlugin'
export * from './defineMacroProvider'
export * from './createMacroManager'

export { vitePluginMacro } from './plugin'

// export types
export type { Babel } from './core/macro/babel'
export type { MacroHelper } from './core/macro/helper'
export type { MacroHandler, MacroContext, Macro } from './core/macro'

export type { MacroProvider, MacroProviderHooks } from './macroProvider'
export type { MacroPlugin, MacroPluginHooks } from './macroPlugin'
export type { MacroManager } from './macroManager'
export type { Exportable, NamespacedExportable } from './core/exports'
export type { ImportOption } from './core/helper/import'
export type { DevServerHelper } from './helper/server'
