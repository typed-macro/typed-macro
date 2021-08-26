import { MacroWithMeta, renderMacroType } from '@/macro'
import {
  NamespacedMacros,
  NamespacedModules,
  NamespacedTypes,
} from '@/runtime/types'

export type Exportable = ({ macros: MacroWithMeta[] } | { code: string }) & {
  customTypes?: string
}

export type NamespacedExportable = { [namespace: string]: Exportable }

export function normalizeExports(exports: NamespacedExportable) {
  const macros: NamespacedMacros = Object.create(null)
  const modules: NamespacedModules = Object.create(null)
  const types: NamespacedTypes = Object.create(null)
  Object.keys(exports).forEach((ns) => {
    const item = exports[ns]
    types[ns] = {
      moduleScope: item.customTypes || '',
      macroScope: [],
    }
    if ('code' in item) {
      modules[ns] = item.code
    } else {
      macros[ns] = item.macros.map((m) => ({ name: m.name, apply: m.apply }))
      types[ns].macroScope = item.macros.map((m) => renderMacroType(m))
    }
  })
  return {
    macros,
    modules,
    types,
  }
}
