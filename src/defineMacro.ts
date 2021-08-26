import { validateFnName } from '@/common'
import { Macro, MacroHandler, MacroWithType } from '@/runtime/types'

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
  withHandler: (handler: MacroHandler) => Macro
}

type MacroMeta = {
  signatures: {
    comment?: string
    signature: string
  }[]
  customTypes: string[]
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
    customTypes: [],
  }

  const builder: MacroBuilder = {
    withCustomType(typeDefinition) {
      meta.customTypes.push(typeDefinition)
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
      return {
        name,
        apply: handler,
        __types: renderMacroType(name, meta),
      } as MacroWithType
    },
  }

  return builder
}

function renderMacroType(name: string, meta: MacroMeta) {
  return [
    meta.customTypes.join('\n'),
    meta.signatures
      .map((s) =>
        s.comment
          ? `  /** ${s.comment} **/
  export function ${name}${s.signature}`
          : `  export function ${name}${s.signature}`
      )
      .join('\n'),
  ]
    .filter((t) => !!t)
    .join('\n')
}
