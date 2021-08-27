import {
  InternalMacroManagerOptions,
  macroManager,
  MacroManager,
} from '@/macroManager'
import { FlatOptions } from '@/common'

export type MacroManagerOptions = FlatOptions<
  InternalMacroManagerOptions['runtimeOptions']
> & {
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
    runtimeOptions: {
      typeRenderer: { typesPath },
      transformer: {
        maxRecursion,
        parserPlugins,
      },
    },
  }
}

export function createMacroManager(options: MacroManagerOptions): MacroManager {
  return macroManager(normalizeOption(options))
}
