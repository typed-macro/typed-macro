import { CallExpression } from '@babel/types'
import { NodePath } from '@babel/traverse'
import { PathHelper } from '@/helper/path'
import { StateHelper } from '@/helper/state'
import { TransformHelper } from '@/helper/transform'
import { Babel } from '@/helper/babel'

export type MacroContext = {
  /**
   * The file path of the module currently being handled.
   */
  filepath: string
  /**
   * The original source code of the module currently being handled.
   */
  code: string
  /**
   * The arguments nodes of the call-macro expression currently being handled.
   */
  args: CallExpression['arguments']
  /*
   * The NodePath of the call-macro expression currently being handled.
   */
  path: NodePath
  /*
   * Whether in ssr mode.
   */
  ssr: boolean
}

export type MacroHelper = TransformHelper & PathHelper & StateHelper

export type MacroHandler = (
  /**
   * Context about the macro caller.
   */
  ctx: MacroContext,
  /**
   * Babel tools to help operate node paths and nodes.
   */
  babel: Readonly<Babel>,
  /**
   * Wrappers upon babel tools to simplify operations.
   */
  helper: Readonly<MacroHelper>
) => void

export type Macro = {
  name: string
  apply: MacroHandler
}

export type NamespacedMacros = { [namespace: string]: Macro[] }

export type NamespacedModules = { [namespace: string]: string }

export type MacroWithType = Macro & {
  __types: string
}

export function isMacroWithType(o: unknown): o is MacroWithType {
  return !!(o as MacroWithType).__types
}

export type Exportable = ({ macros: Macro[] } | { code: string }) & {
  customTypes?: string
}

export type NamespacedExportable = { [namespace: string]: Exportable }

export type NormalizedExports = {
  macros: NamespacedMacros
  modules: NamespacedModules
  types: NamespacedTypes
}

export function normalizeExports(
  exports: NamespacedExportable
): NormalizedExports {
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
      types[ns].macroScope = item.macros.map((m) => {
        if (!isMacroWithType(m)) throw new Error(`${m.name} is not a macro`)
        return m.__types
      })
    }
  })
  return {
    macros,
    modules,
    types,
  }
}

export type NamespacedTypes = {
  [namespace: string]: {
    moduleScope: string
    macroScope: string[]
  }
}

export function renderTypes(types: NamespacedTypes) {
  const namespaces = Object.keys(types)
  return namespaces
    .map((ns) => {
      const item = types[ns]
      return `declare module '${ns}' {
${[item.moduleScope, item.macroScope.join('\n')].filter((t) => !!t).join('\n')}
}`
    })
    .join('\n')
}
