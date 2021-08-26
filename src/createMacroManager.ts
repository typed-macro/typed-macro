import { ParserPlugin } from '@babel/parser'
import {
  InternalMacroManagerOptions,
  macroManager,
  MacroManager,
} from './macroManager'
import { normalizeExports } from '@/exportable'

export type MacroManagerOptions = {
  name: string
  dtsPath: string
  maxRecursion?: number
  parserPlugins?: ParserPlugin[]
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
    maxRecursion,
    parserPlugins,
    ...normalizeExports(exports),
  }
}

export function createMacroManager(options: MacroManagerOptions): MacroManager {
  return macroManager(normalizeOption(options))
}
