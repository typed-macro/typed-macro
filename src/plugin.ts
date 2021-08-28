import { createMacroManager } from '@/createMacroManager'
import { join } from 'path'

/**
 * Get a macro manager of the default options.
 *
 * @see MacroManager
 */
export function vitePluginMacro() {
  return createMacroManager({
    name: 'macro-manager',
    typesPath: join(__dirname, 'macros.d.ts'),
  })
}
