import { createMacroManager } from '@/createMacroManager'
import { join } from 'path'

export default function vitePluginMacro() {
  return createMacroManager({
    name: 'macro-manager',
    dtsPath: join(__dirname, 'macros.d.ts'),
  })
}
