/*
 * This is a compatibility control mechanism based on version number,
 * to ensure the compatibility between macro and runtime.
 */

import { Macro } from '@/core/macro'
import { WithVersion } from '@/common'

/*
 * The current Macro version.
 *
 * It represents whether the call-context passed by the Runtime to the Macro is compatible.
 * This involves not only the structure of the call-context itself,
 * but also the structure of the AST between different versions of Babel,
 * for AST is generated in Runtime but transformed in Macros.
 *
 * @deps {@link RawMacroCall}, {@link Babel}
 */
export const MACRO_VERSION = 0

export function versionedMacro(v: Macro): Macro {
  ;(v as WithVersion<Macro>).$__version = MACRO_VERSION
  return v
}

export function isMacroCompatible(v: Macro) {
  return (v as WithVersion<Macro>).$__version === MACRO_VERSION
}
