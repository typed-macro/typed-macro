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
    // __dirname = vite-plugin-macro/dist/
    // join(__dirname, '../macros.d.ts') = vite-plugin-macro/macros.d.ts
    typesPath: join(__dirname, '../macros.d.ts'),
  })
}
