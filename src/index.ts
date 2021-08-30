export * from './defineMacro'
export * from './defineMacroPlugin'
export * from './defineMacroProvider'
export * from './createMacroManager'

export { vitePluginMacro } from './plugin'

// export types
export type { MacroHandler, MacroContext } from './core/macro'
export type { MacroHelper } from './core/macro/helper'
export type { Exportable, NamespacedExportable } from './core/exports'
export type { ImportOption } from './core/helper/import'
export type { DevServerHelper } from './helper/server'
