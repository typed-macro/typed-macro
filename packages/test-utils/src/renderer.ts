import { ModularizedExportable } from '@typed-macro/core'
import { createTypeRenderer, normalizeExports } from '@typed-macro/runtime'

export type TestTypeRenderer = (exports: ModularizedExportable) => string

/**
 * Create a type renderer to help test the type of macros/modules.
 *
 * e.g.
 * ```typescript
 * const aMacro = defineMacro(...)
 *   .withSignature(...)
 *   .withHandler(...)
 *
 * const renderType = createTestTypeRenderer()
 *
 * expect(
 *   renderType({
 *     '@ns': {
 *       macros: [aMacro],
 *       types: `some types...`,
 *     },
 *     '@another': {
 *       code: `some code...`,
 *       types: `some types...`,
 *     }
 *   })
 * ).toMatchSnapshot()
 * ```
 */
export function createTestTypeRenderer(): TestTypeRenderer {
  return (exports) => {
    const renderer = createTypeRenderer()
    const { types } = normalizeExports(exports)
    Object.keys(types).forEach((moduleName) =>
      renderer.append(moduleName, types[moduleName])
    )
    return renderer.renderToString()
  }
}
