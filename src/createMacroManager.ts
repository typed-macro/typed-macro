import {
  InternalMacroManagerOptions,
  macroManager,
  MacroManager,
} from '@/macroManager'
import { FlatOptions } from '@/common'
import { Runtime, RuntimeOptions } from './core/runtime'

export type MacroManagerOptions = FlatOptions<RuntimeOptions> & {
  name: string
}

function normalizeOption({
  name,
  typesPath,
  maxRecursion,
  parserPlugins,
}: MacroManagerOptions): InternalMacroManagerOptions {
  return {
    name,
    runtime: new Runtime({
      typeRenderer: { typesPath },
      transformer: {
        maxRecursion,
        parserPlugins,
      },
    }),
  }
}

export function createMacroManager(options: MacroManagerOptions): MacroManager {
  return macroManager(normalizeOption(options))
}
