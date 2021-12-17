import { EnvContext, Macro } from '@typed-macro/core'
import { createTransformer, TransformerOptions } from '@typed-macro/runtime'
import { isString } from '@typed-macro/shared'
import { createTestEnvContext } from './env'

export type TestTransformerContext = {
  /**
   * Source code.
   */
  code: string

  /**
   * Path of the source file.
   *
   * Default to 'test.ts'
   */
  filepath?: string

  /**
   * EnvContext for testing.
   *
   * If is undefined, use the default one created by {@link createTestEnvContext}.
   */
  env?: EnvContext
}

export type TestTransformer = {
  (ctx: TestTransformerContext): string
  (code: string): string
}

export type TestTransformerOptions = TransformerOptions & {
  /**
   * Macros to be appended into transformer.
   */
  macros: { [moduleName: string]: Macro[] } // Keep ModularizedMacros internal.
}

/**
 * Create a transformer to help test macros.
 *
 * e.g.
 * ```typescript
 * const aMacro = defineMacro(...)
 *   .withSignature(...)
 *   .withHandler(...)
 *
 * const transform = createTestTransformer({
 *   macros: { '@ns': [aMacro] },
 * })
 *
 * expect(
 *   transform(`some code...`)
 * ).toBe(`some code...`)
 * ```
 */
export function createTestTransformer({
  maxTraversals,
  parserPlugins,
  macros,
}: TestTransformerOptions): TestTransformer {
  const transformer = createTransformer({ maxTraversals, parserPlugins })
  Object.keys(macros).forEach((moduleName) =>
    transformer.appendMacros(moduleName, macros[moduleName])
  )
  return (input) => {
    // normalized
    const {
      code,
      filepath = 'test.ts',
      env = createTestEnvContext(),
    } = isString(input) ? { code: input } : input

    // prepare transformer
    return transformer.transform(code, filepath, env) || code
  }
}
