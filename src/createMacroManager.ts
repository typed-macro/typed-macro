import {
  InternalMacroManagerOptions,
  macroManager,
  MacroManager,
} from '@/macroManager'
import { FlatOptions } from '@/common'
import { Runtime, RuntimeOptions } from './core/runtime'

export type MacroManagerOptions = FlatOptions<RuntimeOptions> & {
  /**
   * The name of macro manager, also the name of the final plugin.
   */
  name: string
}

function normalizeOption({
  name,
  typesPath,
  maxRecursions,
  parserPlugins,
}: MacroManagerOptions): InternalMacroManagerOptions {
  return {
    name,
    runtime: new Runtime({
      typeRenderer: { typesPath },
      transformer: {
        maxRecursions,
        parserPlugins,
      },
    }),
  }
}

/**
 * Define a macro manager.
 * @param options manager options.
 */
export function createMacroManager(options: MacroManagerOptions): MacroManager {
  return macroManager(normalizeOption(options))
}
