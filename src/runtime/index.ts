import {
  NamespacedMacros,
  NamespacedModules,
  NamespacedTypes,
  NormalizedExports,
  renderTypes,
} from '@/runtime/types'
import {
  createTransformer,
  Transformer,
  TransformerOptions,
} from '@/runtime/transformer'
import { findDuplicatedItem } from '@/common'
import { mkdir, writeFile } from 'fs/promises'
import { dirname } from 'path'

export type RuntimeOptions = {
  transformer: TransformerOptions
}

export class Runtime {
  private macros: NamespacedMacros = Object.create(null)
  private modules: NamespacedModules = Object.create(null)
  private types: NamespacedTypes = Object.create(null)

  private macrosNamespaces: string[] = []
  private modulesNamespaces: string[] = []

  private devMode = false

  private readonly transformer: Transformer

  constructor(options: RuntimeOptions) {
    this.transformer = createTransformer(options.transformer)
  }

  setDevMode(dev = true) {
    this.devMode = dev
  }

  register({ macros, modules, types }: NormalizedExports) {
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

  handleLoad(id: string) {
    if (this.macrosNamespaces.includes(id)) return 'export {}'
    if (this.modulesNamespaces.includes(id)) return this.modules[id]
  }

  handleResolveId(id: string) {
    if (
      this.macrosNamespaces.includes(id) ||
      this.modulesNamespaces.includes(id)
    )
      return id
  }

  handleTransform(code: string, id: string, ssr = false) {
    if (/\.[jt]sx?$/.test(id))
      return this.transformer(
        {
          code,
          id,
          ssr,
          dev: this.devMode,
        },
        this.macros
      )
  }

  get container() {
    return {
      macros: this.macros,
      modules: this.modules,
      types: this.types,
    }
  }

  async generateDts(path: string) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, renderTypes(this.types))
  }
}
