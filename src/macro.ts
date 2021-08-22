import traverse, { Node, NodePath } from '@babel/traverse'
import * as types from '@babel/types'
import template from '@babel/template'
import { CallExpression, Program } from '@babel/types'
import { validateFnName } from './common'

export type Context = {
  /**
   * The file path of the module currently being handled.
   */
  filepath: string
  /**
   * The original source code of the module currently being handled.
   */
  code: string
  /**
   * The arguments nodes of the call-macro expression currently being handled.
   */
  args: CallExpression['arguments']
  /*
   * The NodePath of the call-macro expression currently being handled.
   */
  path: NodePath
}

export type BabelTools = {
  types: typeof types
  template: typeof template
  traverse: typeof traverse
}

/**
 * ```typescript
 * import 'moduleName'
 * { moduleName: string }
 *
 * import defaultName from 'moduleName'
 * { defaultName: string; moduleName: string }
 *
 * import { exportName } from 'moduleName'
 * { exportName: string; moduleName: string }
 *
 * import { exportName as localName } from 'moduleName'
 * { localName: string; exportName: string; moduleName: string }
 * ```
 */
export type ImportOption =
  | { moduleName: string }
  | { defaultName: string; moduleName: string }
  | { localName: string; exportName: string; moduleName: string }
  | { exportName: string; moduleName: string }

export type Helper = {
  /**
   * Get the directory of the root project or the nearest project.
   * @param which 'root' or 'leaf'
   */
  projectDir: (which: 'root' | 'leaf') => string

  /**
   * Normalize path pattern so can resolve file paths as import paths
   * @param path relative path or path pattern
   * @param root absolute file path of the project dir, default to projectDir('leaf')
   * @param importer absolute file path of the importer, default to current module
   *
   * e.g. search files by glob pattern and then import them
   *
   * ```typescript
   * // /src/example/a.ts
   * // /src/example/b.ts
   * // in /src/another/index.ts
   * const pattern = '../example/*.ts'
   * const { normalized, base, resolveImportPath } = normalizePathPattern(pattern)
   * const importPaths = glob.sync(normalized, { cwd: base }).map(resolveImportPath)
   *
   * // importPaths = ['../example/a.ts', '../example/b.ts']
   * ```
   */
  normalizePathPattern: (
    path: string,
    root?: string,
    importer?: string
  ) => {
    /**
     * Normalized path or path pattern,
     */
    normalized: string
    /**
     * Base path for the normalized path or path pattern.
     */
    base: string
    /**
     * Get import path from file path got by normalized path and base,
     * almost the opposite operation of normalization
     * @param path file path
     */
    resolveImportPath: (path: string) => string
  }

  /**
   * Prepend import statements to program.
   * @param imports an import or an array of imports
   * @param program node path of the target program for prepending import statements.
   * use the one currently being handled by default.
   */
  prependImports: (
    imports: ImportOption[] | ImportOption,
    program?: NodePath<Program>
  ) => void

  /**
   * Append import statements to the last import statement of the program.
   * @param imports an import or an array of imports
   * @param program node path of the target program for prepending import statements.
   * use the one currently being handled by default.
   */
  appendImports: (
    imports: ImportOption[] | ImportOption,
    program?: NodePath<Program>
  ) => void

  /**
   * Check if an import statement has been added to the target program already.
   * @param imports an import
   * @param program node of the target program. use the one currently being handled by default.
   */
  hasImported: (imports: ImportOption, program?: Program) => boolean

  /**
   * Prepend any node to the target program.
   * @param nodes any node or an array of nodes
   * @param program node path of the target program. use the one currently being handled by default.
   */
  prependToBody: <Nodes extends Node | readonly Node[]>(
    nodes: Nodes,
    program?: NodePath<Program>
  ) => void

  /**
   * Append any node to the target program.
   * @param nodes any node or an array of nodes
   * @param program node path of the target program. use the one currently being handled by default.
   */
  appendToBody: <Nodes extends Node | readonly Node[]>(
    nodes: Nodes,
    program?: NodePath<Program>
  ) => void

  /**
   * Get current program or the program of provided node.
   * @param node any node path
   */
  getProgram: (node?: NodePath) => NodePath<Program>

  /**
   * Force to recollect imported macros in the next loop.
   * Usually used after importing new macros to program during expanding a macro.
   *
   * Note:
   *
   *  Only collected imported macros can be applied, because plugin only
   *  searches call expressions for collected macros. Also, external macros
   *  cannot be collected because plugin is unaware of external macros.
   */
  forceRecollectMacros: () => void
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
  withSignature: (signature: string, comment?: string) => MacroBuilder
  /**
   * Set the transform handler and get the macro.
   */
  withHandler: (transformer: Transformer) => Macro
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
