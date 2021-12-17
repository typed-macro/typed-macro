import { NodePath } from '@babel/traverse'
import { ImportDeclaration, Node, Program } from '@babel/types'
import { ImportOption, MacroHelper } from '@typed-macro/core'
import { ImportedMacroContainer } from '../traverse'
import { matchImportStmt, renderImportStmt } from './import'
import template from '@babel/template'
import { isArray } from '@typed-macro/shared'

/**
 * @internal
 */
export function createMacroHelper(
  thisProgram: NodePath<Program>,
  importedMacros: ImportedMacroContainer
): MacroHelper {
  return {
    findImported: ((imp, loose = false, program = thisProgram) => {
      if (isArray(imp)) return imp.map((i) => findImported(program, i, loose))
      return findImported(program, imp, loose)
    }) as MacroHelper['findImported'],

    prependImports: ((imports, program = thisProgram) =>
      prependImports(program, imports)) as MacroHelper['prependImports'],

    appendImports: ((imports, program = thisProgram) =>
      appendImports(program, imports)) as MacroHelper['appendImports'],

    prependToBody: ((nodes, program = thisProgram) => {
      return prependToBody(program, nodes)
    }) as MacroHelper['prependToBody'],

    appendToBody: ((nodes, program = thisProgram) => {
      return appendToBody(program, nodes)
    }) as MacroHelper['appendToBody'],

    containsMacros: ((paths) => {
      if (!isArray(paths)) return importedMacros.testContainsMacros([paths])[0]
      return importedMacros.testContainsMacros(paths)
    }) as MacroHelper['containsMacros'],
  }
}

export function findImported(
  program: NodePath<Program>,
  imp: ImportOption,
  loose: boolean
) {
  // An import declaration can only be used in top-level.
  for (const path of program.get('body') as NodePath[]) {
    if (path.isImportDeclaration() && matchImportStmt(imp, path.node, loose))
      return path
  }
}

export function prependImports(
  program: NodePath<Program>,
  imports: ImportOption | ImportOption[]
) {
  let lastInserted: NodePath<ImportDeclaration>
  const inserter = (stmt: ImportDeclaration) =>
    (lastInserted = lastInserted
      ? lastInserted.insertAfter(stmt)[0]
      : program.unshiftContainer('body', stmt)[0])

  return insertImports(program, imports, inserter)
}

export function appendImports(
  program: NodePath<Program>,
  imports: ImportOption | ImportOption[]
) {
  let lastInserted = program
    .get('body')
    .filter((p) => p.isImportDeclaration())
    .pop()
  const inserter = (stmt: ImportDeclaration) =>
    (lastInserted = lastInserted
      ? lastInserted.insertAfter(stmt)[0]
      : program.unshiftContainer('body', stmt)[0])

  return insertImports(program, imports, inserter)
}

export function prependToBody(
  program: NodePath<Program>,
  nodes: Node | Node[]
) {
  if (isArray(nodes)) return program.unshiftContainer('body', nodes)
  return program.unshiftContainer('body', nodes)[0]
}

export function appendToBody(program: NodePath<Program>, nodes: Node | Node[]) {
  if (isArray(nodes)) return program.pushContainer('body', nodes)
  return program.pushContainer('body', nodes)[0]
}

export function insertImports(
  program: NodePath<Program>,
  imports: ImportOption[] | ImportOption,
  inserter: (stmt: ImportDeclaration) => NodePath<ImportDeclaration>
) {
  if (isArray(imports)) {
    if (!imports.length) return []
    return imports.map((imp) => {
      const existed = findImported(program, imp, false)
      if (existed) return existed
      return inserter(
        template.statement.ast(renderImportStmt(imp)) as ImportDeclaration
      )
    })
  }
  const existed = findImported(program, imports, false)
  if (existed) return existed
  return inserter(
    template.statement.ast(renderImportStmt(imports)) as ImportDeclaration
  )
}
