import {
  NamespacedMacros,
  NamespacedModules,
  NamespacedTypes,
} from '@/runtime/types'
import { Transformer, TransformerContext } from '@/runtime/transformer'
import { findDuplicatedItem } from '@/common'
import { mkdir, writeFile } from 'fs/promises'
import { dirname } from 'path'

export class MacroContainer {
  protected macros: NamespacedMacros = Object.create(null)
  protected modules: NamespacedModules = Object.create(null)
  protected types: NamespacedTypes = Object.create(null)
  protected macrosNamespaces: string[] = []
  protected modulesNamespaces: string[] = []

  constructor(private transformer: Transformer) {}

  add(
    macros: NamespacedMacros,
    modules: NamespacedModules,
    types: NamespacedTypes
  ) {
    {
      const duplicated = findDuplicatedItem(
        Object.keys(types),
        Object.keys(this.types)
      )
      if (duplicated) throw new Error(`duplicated namespace '${duplicated}'.`)
    }
    {
      Object.keys(macros).forEach((ns) => {
        const mem = Object.create(null)
        macros[ns].forEach((m) => {
          if (mem[m.name]) {
            throw new Error(
              `a macro with name '${m.name}' in '${ns}' already existed`
            )
          }
          mem[m.name] = 1
        })
      })
    }
    Object.assign(this.macros, macros)
    this.macrosNamespaces = Object.keys(this.macros)
    Object.assign(this.modules, modules)
    this.modulesNamespaces = Object.keys(this.modules)
    Object.assign(this.types, types)
  }

  callLoad(id: string) {
    if (this.macrosNamespaces.includes(id)) return 'export {}'
    if (this.modulesNamespaces.includes(id)) return this.modules[id]
  }

  callResolveId(id: string) {
    if (
      this.macrosNamespaces.includes(id) ||
      this.modulesNamespaces.includes(id)
    )
      return id
  }

  callTransform(ctx: TransformerContext) {
    return this.transformer(ctx, this.macros)
  }

  async generateDts(path: string) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, renderTypes(this.types))
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
