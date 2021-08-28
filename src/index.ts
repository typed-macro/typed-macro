export * from './defineMacro'
export * from './defineMacroPlugin'
export * from './defineMacroProvider'
export * from './createMacroManager'

export { vitePluginMacro } from './plugin'

// export types
export type { MacroHandler, MacroContext, MacroHelper } from './core/macro'
export type { Exportable, NamespacedExportable } from './core/exports'
export type { ImportOption } from './core/helper/import'
export type { DevServerHelper } from './helper/server'
