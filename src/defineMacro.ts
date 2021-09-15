import { validateFnName } from '@/common'
import { Macro, MacroHandler } from '@/core/macro'
import { macro, MacroMeta } from '@/core/macro'

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
   *
   * Async function can not be used as macro handler.
   *
   * If the handler is a normal function, the nested macros inside the current
   * call expression will be expanded automatically before calling the handler.
   *
   * If the handler is a generator function, you can:
   *  - yield node paths of import statements to collect macros from them,
   *    note macros must be collected before used, or you can wait for the next round of traversal,
   *    and the runtime(transformer) will collect imported macros again before the traversal
   *  - yield node paths to actively expand macros inside them
   *
   * e.g.
   * ```typescript
   * .withHandler(function*({ args }) {
   *   // do some thing
   *   yield args // expand macros inside the current call expression
   *   // do some thing
   *   yield someOtherNodePath
   *   // do some thing
   * })
   * ```
   */
  withHandler: (handler: MacroHandler) => Macro
}

/**
 * Define a macro.
 * @param name the name of the macro, should be a valid identifier name.
 * @return macro builder.
 */
export function defineMacro(name: string): Omit<MacroBuilder, 'withHandler'> {
  if (!validateFnName(name))
    throw new Error(`'${name}' is not a valid macro name!`)

  const meta: MacroMeta = {
    signatures: [],
    types: [],
  }

  const builder: MacroBuilder = {
    withCustomType(typeDefinition) {
      meta.types.push(typeDefinition)
      return builder
    },
    withSignature(signature, comment) {
      meta.signatures.push({ signature, comment })
      return builder
    },
    withHandler(handler) {
      if (meta.signatures.length === 0)
        throw new Error(
          `Please call .withSignature() before .withHandler() to specify at least one signature for macro '${name}'`
        )
      return macro(name, meta, handler)
    },
  }

  return builder
}
