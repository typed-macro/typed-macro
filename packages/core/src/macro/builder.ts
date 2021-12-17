import { macro, Macro, MacroHandler, MacroMeta } from './macro'
import { validateFnName } from '@typed-macro/shared'

export type MacroBuilder = {
  /**
   * Add custom type definitions.
   *
   * They will be rendered with macro signatures.
   *
   * @param typeDefinition like 'export type SomeType = string'
   */
  withCustomType(typeDefinition: string): Omit<MacroBuilder, 'withHandler'>

  /**
   * Add signature of macro. one macro requires at least one signature.
   * @param signature - function signature, like '(s: string): void'
   * @param comment - comment for the signature, will be written to .d.ts
   * before the corresponding function signature.
   */
  withSignature(
    signature: string,
    comment?: string
  ): Omit<MacroBuilder, 'withCustomType'>

  /**
   * Set the transform handler and get the macro.
   *
   * @see MacroHandler
   */
  withHandler(handler: MacroHandler): Macro
}

/**
 * Define a macro.
 *
 * For example,
 * ```typescript
 * defineMacro('someMacro')
 *   .withCustomType('export type SomeType = string')
 *   .withSignature('(): SomeType', 'some comments')
 *   .withHandler(({ path }) => {
 *     path.remove()
 *   })
 * ```
 *
 * @param name - the name of the macro, should be a valid identifier name.
 */
export function defineMacro(name: string): Omit<MacroBuilder, 'withHandler'> {
  if (!validateFnName(name))
    throw new Error(`'${name}' is not a valid macro name!`)

  const meta: MacroMeta = {
    name,
    signatures: [],
    types: [],
  }

  const builder: MacroBuilder = {
    withCustomType(typeDefinition) {
      meta.types.push(typeDefinition)
      return builder
    },
    withSignature(signature, comment) {
      if (!signature)
        throw new Error(
          `Signature for macro '${name}' can not be an empty string`
        )
      meta.signatures.push({ signature, comment })
      return builder
    },
    withHandler(handler) {
      if (meta.signatures.length === 0)
        throw new Error(
          `Please call .withSignature() before .withHandler() to specify at least one signature for macro '${name}'`
        )
      return macro(meta, handler)
    },
  }

  return builder
}
