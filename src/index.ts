export * from './defineMacro'
export * from './defineMacroPlugin'
export * from './defineMacroProvider'
export * from './createMacroManager'

import vitePluginMacro from './plugin'
export default vitePluginMacro

// export types
export type { MacroHandler, MacroContext } from '@/runtime/types'
export type { Babel } from '@/helper/babel'
export type { DevServerHelper } from '@/helper/server'
export type { ImportOption } from '@/helper/import'
