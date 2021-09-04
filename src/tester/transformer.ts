import { NamespacedMacros } from '@/core/exports'
import { createTransformer, TransformerOptions } from '@/core/transformer'

export type TestTransformerContext = {
  /**
   * Source code.
   */
  code: string

  /**
   * Path of the source file.
   *
   * Default to 'test.tsx'
   */
  filepath?: string

  /**
   * Is in SSR mode.
   *
   * Default to false.
   */
  ssr?: boolean

  /**
   * Is in dev mode.
   *
   * Default to false.
   *
   * If in dev mode, the import statements that imports macros
   * will be retained and rewritten by the runtime
   * to track the module's dependence on the macro.
   */
  dev?: boolean
}

export type TestTransformer = {
  (ctx: TestTransformerContext, macros: NamespacedMacros): string
  (code: string, macros: NamespacedMacros): string
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
 * const transform = createTestTransformer()
 *
 * expect(
 *   transform(`some code...`, { '@ns': [aMacro] })
 * ).toBe(`some code...`)
 * ```
 *
 * @param options the same as the one of transformer
 */
export function createTestTransformer(
  options: TransformerOptions = {}
): TestTransformer {
  const transform = createTransformer(options)
  return (input, macros) => {
    const {
      code,
      filepath = 'test.tsx',
      ssr = false,
      dev = false,
    } = typeof input === 'string' ? { code: input } : input
    return transform({ code, filepath, ssr, dev }, macros) || code
  }
}
