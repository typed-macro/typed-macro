import {
  EnvContext,
  MacroProvider,
  MacroProviderHooks,
  MacroProviderOptions,
} from '@typed-macro/core'
import { createFilter, Filter, FilterOptions } from '../filter'
import { createLoader, Loader } from '../loader'
import { createTypeRenderer, TypeRenderer } from '../renderer'
import { createHookContainer, HookContainer } from '../hook'
import {
  createTransformer,
  Transformer,
  TransformerOptions,
} from '../transformer'
import { NormalizedExports, normalizeMacroProvider } from '../normalizer'

export type RuntimeOptions = {
  /**
   * @see FilterOptions
   */
  filter?: FilterOptions

  /**
   * @see TransformerOptions
   */
  transformer?: TransformerOptions
}

export type Runtime = {
  /**
   * Append macro providers into runtime.
   */
  appendProvider(provider: MacroProvider): void
  /**
   * Render types into file.
   */
  renderTypes(filepath: string): Promise<void>
  /**
   * Call onStart hooks.
   */
  start(): Promise<void>
  /**
   * Call onStop hooks.
   */
  stop(): Promise<void>
  /**
   * Process file transformation, including calling transform-related hooks
   * and macro transformation.
   */
  transform(code: string, id: string): Promise<string>
  /**
   * Check is file should be transformed.
   */
  filter(id: string): Promise<boolean>
  /**
   * Load code by module name.
   */
  load(id: string): string | undefined
  /**
   * Check if the virtual module exists.
   */
  resolveId(id: string): string | undefined
  /** @internal */
  internal: {
    env: EnvContext
    filter: Filter
    loader: Loader
    renderer: TypeRenderer
    transformer: Transformer
    hookContainer: HookContainer
  }
}

export function createRuntime(
  env: EnvContext,
  options: RuntimeOptions
): Runtime {
  const filter = createFilter(options.filter || {})
  const loader = createLoader()
  const renderer = createTypeRenderer()
  const transformer = createTransformer(options.transformer || {})
  const hookContainer = createHookContainer()

  let providerCount = 0

  return {
    appendProvider(provider) {
      try {
        const normalized = normalizeMacroProvider(provider, env)
        appendExports(normalized.normalizedExports)
        normalized.hooks && appendHooks(normalized.hooks)
        normalized.options && appendOptions(normalized.options)
        providerCount++
      } catch (e) {
        throw new Error(
          `Error when add the macro provider at index ${providerCount}: ${e}`
        )
      }
    },
    async renderTypes(filepath: string) {
      await renderer.renderToFile(filepath)
    },
    async start() {
      await hookContainer.onStart()
    },
    async stop() {
      await hookContainer.onStop()
    },
    async transform(code, id) {
      const preTransformed = await hookContainer.beforeTransform(code, id)
      const transformed = transformer.transform(preTransformed, id, env)
      return await hookContainer.afterTransform(
        transformed || preTransformed,
        id
      )
    },
    async filter(id) {
      if (filter.isExcluded(id)) return false
      return filter.isIncluded(id) || (await hookContainer.onFilter(id))
    },
    load(id) {
      return loader.load(id)
    },
    resolveId(id) {
      return loader.load(id) ? id : undefined
    },
    internal: {
      env,
      filter,
      loader,
      renderer,
      transformer,
      hookContainer,
    },
  }

  function appendExports({ types, codes, macros }: NormalizedExports) {
    Object.keys(types).forEach((moduleName) => {
      renderer.append(moduleName, types[moduleName])
    })
    Object.keys(codes).forEach((moduleName) => {
      loader.append(moduleName, codes[moduleName])
    })
    Object.keys(macros).forEach((moduleName) => {
      loader.append(moduleName)
      transformer.appendMacros(moduleName, macros[moduleName])
    })
  }

  function appendHooks(hooks: MacroProviderHooks) {
    hookContainer.append(hooks)
  }

  function appendOptions(options: MacroProviderOptions) {
    options.parserPlugins &&
      transformer.appendParserPlugins(options.parserPlugins)
  }
}
