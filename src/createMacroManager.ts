import {
  InternalMacroManagerOptions,
  macroManager,
  MacroManager,
} from './macroManager'
import { TransformerOptions } from '@/runtime/transformer'

export type MacroManagerOptions = TransformerOptions & {
  name: string
  dtsPath: string
}

function normalizeOption({
  name,
  dtsPath,
  maxRecursion,
  parserPlugins,
}: MacroManagerOptions): InternalMacroManagerOptions {
  return {
    name,
    dtsPath,
    transformer: {
      maxRecursion,
      parserPlugins,
    },
  }
}

export function createMacroManager(options: MacroManagerOptions): MacroManager {
  return macroManager(normalizeOption(options))
}
