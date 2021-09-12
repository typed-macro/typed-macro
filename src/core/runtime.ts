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
  NamespacedMacros,
  NamespacedModules,
  NamespacedTypes,
  NormalizedExports,
  validateMacros,
} from './exports'
import { DeepPartial, findDuplicatedItem } from '@/common'
import { createFilter, FilterOptions } from './filter'

export type RuntimeOptions = {
  /**
   * The options for transformer.
   */
  transformer: TransformerOptions
  /**
   * The options for typeRenderer.
   */
  typeRenderer: Pick<TypeRendererOptions, 'typesPath'>
  /**
   * The options that control the filtering of which files
   * require transformations to be applied.
   */
  filter: FilterOptions
}

export type Attachable = {
  exports: NormalizedExports
  options?: DeepPartial<RuntimeOptions>
}

export class Runtime {
  private macros: NamespacedMacros = Object.create(null)
  private modules: NamespacedModules = Object.create(null)
  private types: NamespacedTypes = Object.create(null)

  private macrosNamespaces: string[] = []
  private modulesNamespaces: string[] = []

  private devMode = false

  constructor(
    private readonly _options: RuntimeOptions,
    defaultExports?: NormalizedExports
  ) {
    if (defaultExports) this.addExports(defaultExports)
  }

  setDevMode(dev = true) {
    this.devMode = dev
  }

  addExports({ macros, modules, types }: NormalizedExports) {
    assertNoDuplicatedNamespace(Object.keys(this.types), Object.keys(types))
    assertNoDuplicatedNamespace(this.macrosNamespaces, Object.keys(macros))
    assertNoDuplicatedNamespace(this.modulesNamespaces, Object.keys(modules))
    validateMacros(macros)
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

  private _transformer?: Transformer
  private _typeRenderer?: TypeRenderer
  private _filter?: (id: string) => boolean

  get attachable() {
    return {
      options: this._options,
      exports: {
        macros: this.macros,
        modules: this.modules,
        types: this.types,
      },
    }
  }

  get filter() {
    return this._filter || (this._filter = createFilter(this._options.filter))
  }

  get transformer() {
    return (
      this._transformer ||
      (this._transformer = createTransformer(this._options.transformer))
    )
  }

  get typeRenderer() {
    return (
      this._typeRenderer ||
      (this._typeRenderer = createTypeRenderer({
        types: this.types,
        typesPath: this._options.typeRenderer.typesPath,
      }))
    )
  }

  handleTransform(code: string, filepath: string, ssr = false) {
    if (this.filter(filepath))
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

  mergeOptions(options: DeepPartial<RuntimeOptions>) {
    if (options.transformer) {
      // reset transformer
      this._transformer = undefined
      // merge transformer#parserPlugins
      if (options.transformer.parserPlugins?.length) {
        this._options.transformer.parserPlugins = Array.from(
          new Set([
            ...(this._options.transformer.parserPlugins || []),
            ...options.transformer.parserPlugins,
          ])
        )
      }
    }
  }

  attach({ exports, options }: Attachable) {
    // merge exports
    this.addExports(exports)
    // merge options
    options && this.mergeOptions(options)
  }
}

export function assertNoDuplicatedNamespace(ns1: string[], ns2: string[]) {
  const duplicated = findDuplicatedItem(ns1, ns2)
  if (duplicated) throw new Error(`duplicated namespace '${duplicated}'.`)
}
