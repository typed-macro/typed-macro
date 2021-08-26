import { Macro } from '@/runtime/types'

export type MacroMeta = {
  signatures: {
    comment?: string
    signature: string
  }[]
  types: string[]
}

export type MacroWithMeta = Macro & {
  meta: MacroMeta
}

export function renderMacroType({ name, meta }: MacroWithMeta) {
  return [
    meta.types.join('\n'),
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
