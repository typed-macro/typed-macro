import { Node, NodePath } from '@babel/traverse'
import template from '@babel/template'
import { File, ImportDeclaration, Program } from '@babel/types'
import { ImportOption, matchImportStmt, renderImportStmt } from './import'
import { findProgramPath } from '@/common'

export type TransformHelper = {
  /**
   * Prepend import statements to program.
   * @param imports an import or an array of imports
   * @param program node path of the target program for prepending import statements.
   * use the one currently being handled by default.
   * @return node path of the last inserted import statement,
   *   or undefined if imports param is array and length === 0
   */
  prependImports: (
    imports: ImportOption[] | ImportOption,
    program?: NodePath<Program>
  ) => NodePath<ImportDeclaration> | undefined

  /**
   * Append import statements to the last import statement of the program.
   * @param imports an import or an array of imports
   * @param program node path of the target program for prepending import statements.
   * use the one currently being handled by default.
   * @return node path of the last inserted import statement
   *   or undefined if imports param is array and length === 0
   */
  appendImports: (
    imports: ImportOption[] | ImportOption,
    program?: NodePath<Program>
  ) => NodePath<ImportDeclaration> | undefined

  /**
   * Find an import statement that has been in the target program already.
   * Note that findImported() will not resolve extension for moduleName automatically.
   * @param imports an import
   * @param loose match loosely, defaults to true, e.g:
   * `import { a as _a } from 'a'` will match `{ moduleName: 'a' }` and `{ moduleName: 'a', exportName: 'a' }`
   * @param program node path of the target program. use the one currently being handled by default.
   */
  findImported: (
    imports: ImportOption,
    loose?: boolean,
    program?: NodePath<Program>
  ) => NodePath<ImportDeclaration> | undefined

  /**
   * Check if an import statement has been in the target program already.
   * Note that hasImported() will not resolve extension for moduleName automatically.
   * @param imports an import
   * @param loose match loosely, defaults to true, e.g:
   * `import { a as _a } from 'a'` will match `{ moduleName: 'a' }` and `{ moduleName: 'a', exportName: 'a' }`
   * @param program node path of the target program. use the one currently being handled by default.
   */
  hasImported: (
    imports: ImportOption,
    loose?: boolean,
    program?: NodePath<Program>
  ) => boolean

  /**
   * Prepend any node to the target program.
   * @param nodes any node or an array of nodes
   * @param program node path of the target program. use the one currently being handled by default.
   * @return node path of the last inserted node
   */
  prependToBody: <Nodes extends Node | readonly Node[]>(
    nodes: Nodes,
    program?: NodePath<Program>
  ) => NodePath

  /**
   * Append any node to the target program.
   * @param nodes any node or an array of nodes
   * @param program node path of the target program. use the one currently being handled by default.
   * @return node path of the last inserted node
   */
  appendToBody: <Nodes extends Node | readonly Node[]>(
    nodes: Nodes,
    program?: NodePath<Program>
  ) => NodePath

  /**
   * Get current program or the program of provided node.
   * @param node any node path
   */
  getProgram: (node?: NodePath) => NodePath<Program>
}

export function getTransformHelper(ast: File): TransformHelper {
  const thisProgram = findProgramPath(ast)

  const findImported: TransformHelper['findImported'] = (
    imp,
    loose = true,
    program = thisProgram
  ) => {
    // An import declaration can only be used in top-level.
    for (const path of program.get('body') as NodePath[]) {
      if (!path.isImportDeclaration()) continue
      if (matchImportStmt(imp, path.node, loose)) return path
    }
  }

  const hasImported: TransformHelper['hasImported'] = (
    imp,
    loose = true,
    program = thisProgram
  ) => {
    return findImported(imp, loose, program) !== undefined
  }

  // returns
  // - array: generated import statements
  // - path: all import statements are duplicated, returns the node path of the last one
  // - undefined: none import statement provided
  function normalizeImports(
    imports: ImportOption | ImportOption[],
    program: NodePath<Program>
  ) {
    if (Array.isArray(imports)) {
      if (imports.length === 0) return
    } else {
      imports = [imports]
    }
    // remove duplicated
    const toBeImported = imports.filter(
      (imp) => !hasImported(imp, false, program)
    )
    // all import statements are duplicated, returns the node path of the last one
    if (!toBeImported.length)
      return findImported(imports[imports.length - 1], false, program)!
    return template.statements.ast(
      Array.from(
        new Set(toBeImported.map((imp) => renderImportStmt(imp)))
      ).join('; ')
    ) as ImportDeclaration[]
  }

  const prependImports: TransformHelper['prependImports'] = (
    imports,
    program = thisProgram
  ) => {
    const toBeImported = normalizeImports(imports, program)
    if (!toBeImported) return
    if (!Array.isArray(toBeImported)) return toBeImported
    const firstImport = (program.get('body') as NodePath[]).filter((p) =>
      p.isImportDeclaration()
    )[0]
    return (
      firstImport
        ? firstImport.insertBefore(toBeImported)
        : program.unshiftContainer('body', toBeImported)
    ).pop() as NodePath<ImportDeclaration>
  }

  const appendImports: TransformHelper['appendImports'] = (
    imports,
    program = thisProgram
  ) => {
    const toBeImported = normalizeImports(imports, program)
    if (!toBeImported) return
    if (!Array.isArray(toBeImported)) return toBeImported
    const lastImport = (program.get('body') as NodePath[])
      .filter((p) => p.isImportDeclaration())
      .pop()
    return (
      lastImport
        ? lastImport.insertAfter(toBeImported)
        : program.unshiftContainer('body', toBeImported)
    ).pop() as NodePath<ImportDeclaration>
  }

  const prependToBody: TransformHelper['prependToBody'] = (
    nodes,
    program = thisProgram
  ) => {
    return program.unshiftContainer('body', nodes).pop() as NodePath
  }

  const appendToBody: TransformHelper['appendToBody'] = (
    nodes,
    program = thisProgram
  ) => {
    return program.pushContainer('body', nodes).pop() as NodePath
  }

  const getProgram: TransformHelper['getProgram'] = (node) => {
    if (!node) return thisProgram
    return node.findParent((p) => p.isProgram()) as NodePath<Program>
  }

  return {
    findImported,
    hasImported,
    prependImports,
    appendImports,
    prependToBody,
    appendToBody,
    getProgram,
  }
}
