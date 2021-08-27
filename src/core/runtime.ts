import {
  createTypeRenderer,
  TypeRenderer,
  TypeRendererOptions,
} from '@/core/typeRenderer'
import {
  createTransformer,
  Transformer,
  TransformerOptions,
} from '@/core/transformer'
import {
  assertNoConflictMacro,
  NamespacedMacros,
  NamespacedModules,
  NamespacedTypes,
  NormalizedExports,
} from './exports'
import { findDuplicatedItem } from '@/common'

export type RuntimeOptions = {
  transformer: TransformerOptions
  typeRenderer: Pick<TypeRendererOptions, 'typesPath'>
}

export class Runtime {
  private macros: NamespacedMacros = Object.create(null)
  private modules: NamespacedModules = Object.create(null)
  private types: NamespacedTypes = Object.create(null)

  private macrosNamespaces: string[] = []
  private modulesNamespaces: string[] = []

  private devMode = false

  private readonly transformer: Transformer
  private readonly _typeRenderer: TypeRenderer

  constructor(options: RuntimeOptions) {
    this.transformer = createTransformer(options.transformer)
    this._typeRenderer = createTypeRenderer({
      types: this.types,
      typesPath: options.typeRenderer.typesPath,
    })
  }

  setDevMode(dev = true) {
    this.devMode = dev
  }

  register({ macros, modules, types }: NormalizedExports) {
    assertNoDuplicatedNamespace(Object.keys(this.types), Object.keys(types))
    assertNoDuplicatedNamespace(this.macrosNamespaces, Object.keys(macros))
    assertNoDuplicatedNamespace(this.modulesNamespaces, Object.keys(modules))
    assertNoConflictMacro(macros)
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

  handleTransform(code: string, filepath: string, ssr = false) {
    if (/\.[jt]sx?$/.test(filepath))
      return this.transformer(
        {
          code,
          filepath,
          ssr,
          dev: this.devMode,
        },
        this.macros
      )
  }

  get exports(): NormalizedExports {
    return {
      macros: this.macros,
      modules: this.modules,
      types: this.types,
    }
  }

  get typeRenderer() {
    return this._typeRenderer
  }
}

export function assertNoDuplicatedNamespace(ns1: string[], ns2: string[]) {
  const duplicated = findDuplicatedItem(ns1, ns2)
  if (duplicated) throw new Error(`duplicated namespace '${duplicated}'.`)
}
