import { Macro } from '../macro'

/**
 * An Exportable is a virtual module holding macros **or** code.
 *
 * If both macros and code are set, the macros would be ignored.
 */
export type Exportable = (
  | {
      /**
       * macros
       */
      macros: Macro[]
    }
  | {
      /**
       * code in **Javascript**
       */
      code: string
    }
) & {
  /**
   * Type definitions, will be written to d.ts.
   *
   * e.g.
   * ```typescript
   * { exports: { '@macros': { types: `type A = string` } } }
   * ```
   * will generate
   * ```typescript
   * declare module '@macros' {
   *   type A = string
   * }
   * ```
   */
  types?: string
}

/**
 * Organize {@link Exportable}s.
 */
export type ModularizedExportable = { [moduleName: string]: Exportable }
