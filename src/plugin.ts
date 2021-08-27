import { createMacroManager } from '@/createMacroManager'
import { join } from 'path'

export function vitePluginMacro() {
  return createMacroManager({
    name: 'macro-manager',
    typesPath: join(__dirname, 'macros.d.ts'),
  })
}
