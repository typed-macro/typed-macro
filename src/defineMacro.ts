import { NO_OP, validateFnName } from '@/common'
import type { MacroWithMeta } from '@/macro'
import { MacroHandler } from '@/runtime/types'

type MacroBuilder = {
  /**
   * Add custom type definition, it will be written to .d.ts before macro signature.
   */
  withCustomType: (typeDefinition: string) => Omit<MacroBuilder, 'withHandler'>
  /**
   * Add signature of macro. one macro requires at least one signature.
   * @param signature function signature, like '(s: string): void'
   * @param comment comment for the signature, will be written to .d.ts
   * before the corresponding function signature.
   */
  withSignature: (
    signature: string,
    comment?: string
  ) => Omit<MacroBuilder, 'withCustomType'>
  /**
   * Set the transform handler and get the macro.
   */
  withHandler: (handler: MacroHandler) => MacroWithMeta
}

/**
 * Define a macro.
 * @param name the name of the macro, should be a valid identifier name.
 * @return macro builder.
 */
export function defineMacro(name: string): Omit<MacroBuilder, 'withHandler'> {
  if (!validateFnName(name))
    throw new Error(`'${name}' is not a valid macro name!`)

  const macro: MacroWithMeta = {
    name,
    meta: {
      signatures: [],
      types: [],
    },
    apply: NO_OP,
  }

  const builder: MacroBuilder = {
    withCustomType(typeDefinition) {
      macro.meta.types.push(typeDefinition)
      return builder
    },
    withSignature(signature, comment) {
      macro.meta.signatures.push({ signature, comment })
      return builder
    },
    withHandler(handler) {
      if (macro.meta.signatures.length === 0)
        throw new Error(
          `Please call .withSignature() before .withHandler() to specify at least one signature for macro '${name}'`
        )
      macro.apply = handler
      return macro
    },
  }

  return builder
}
