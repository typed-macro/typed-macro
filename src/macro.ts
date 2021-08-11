import traverse, { Node, NodePath } from '@babel/traverse'
import * as types from '@babel/types'
import template from '@babel/template'
import { CallExpression, Program } from '@babel/types'
import { validateFnName } from './common'

export type Context = {
  filepath: string
  code: string
  args: CallExpression['arguments']
  path: NodePath
}

export type BabelTools = {
  types: typeof types
  template: typeof template
  traverse: typeof traverse
}

export type Imports =
  | { moduleName: string }
  | { defaultName: string; moduleName: string }
  | { localName: string; exportName: string; moduleName: string }
  | { exportName: string; moduleName: string }

export type Helper = {
  // get the directory of the root project or the nearest project
  projectDir: (which: 'root' | 'leaf') => string
  // normalize path pattern so can resolve file paths as import paths
  normalizePathPattern: (
    // relative path pattern to be imported
    path: string,
    // path of the project root dir
    root?: string,
    // path of the importer
    importer?: string
  ) => {
    // normalized path to be imported, e.g. ../../a => a
    normalized: string
    // base path for normalized path
    base: string
    // resolve import path, almost the opposite operation of normalization
    resolveImportPath: (s: string) => string
  }
  // prepend import statements to program
  prependImports: (
    imports: Imports[] | Imports,
    program?: NodePath<Program>
  ) => void
  // check if imported
  hasImported: (imports: Imports, program?: Program) => boolean
  // prepend any node to program
  prependToBody: <Nodes extends Node | readonly Node[]>(
    nodes: Nodes,
    program?: NodePath<Program>
  ) => void
  // append any node to program
  appendToBody: <Nodes extends Node | readonly Node[]>(
    nodes: Nodes,
    program?: NodePath<Program>
  ) => void

  // force to recollect imported macros in the next loop.
  // usually called after import a new macro to program.
  forceRecollectMacros: () => void

  // make a block stmt become an expression
  run: <T>(fn: () => T) => T
}

export type Transformer = (
  ctx: Context,
  babel: Readonly<BabelTools>,
  helper: Readonly<Helper>
) => void

export type MacroMeta = {
  signatures: {
    comment?: string
    signature: string
  }[]
  typeDefinitions: string[]
}

export type Macro = {
  name: string
  meta: MacroMeta
  apply: Transformer
}

type MacroBuilder = {
  // add custom type definition, it will be written to .d.ts before macro signature
  withCustomType: (typeDefinition: string) => Omit<MacroBuilder, 'withHandler'>
  // add signature of macro placeholder. one macro requires at least one signature.
  withSignature: (signature: string, comment?: string) => MacroBuilder
  // set the transform handler for this macro
  withHandler: (transformer: Transformer) => Macro
}

export function defineMacro(name: string): Omit<MacroBuilder, 'withHandler'> {
  if (!validateFnName(name))
    throw new Error(`'${name}' is not a valid macro name!`)

  const meta: MacroMeta = {
    signatures: [],
    typeDefinitions: [],
  }

  const builder: MacroBuilder = {
    withCustomType(typeDefinition) {
      meta.typeDefinitions.push(typeDefinition)
      return builder
    },
    withSignature(signature, comment) {
      if (comment) {
        comment = `/** ${comment} **/`
      }
      meta.signatures.push({ signature, comment })
      return builder
    },
    withHandler(transformer) {
      if (meta.signatures.length === 0)
        throw new Error(
          `Please call .withSignature() before .withHandler() to specify at least one signature for macro '${name}'`
        )

      return {
        name,
        meta,
        apply: transformer,
      }
    },
  }

  return builder
}
