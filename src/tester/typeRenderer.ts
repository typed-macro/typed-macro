import { NamespacedExportable, normalizeExports } from '@/core/exports'
import { renderTypes } from '@/core/typeRenderer'

export type TestTypeRenderer = (exports: NamespacedExportable) => string

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
 *       macros: [aMacro]
 *       customTypes: `some types...`
 *     },
 *     '@another': {
 *       code: `some code...`
 *       customTypes: `some types...`
 *     }
 *   })
 * ).toMatchSnapshot()
 * ```
 */
export function createTestTypeRenderer(): TestTypeRenderer {
  return (exports) => {
    const normalized = normalizeExports(exports)
    return renderTypes(normalized.types)
  }
}
