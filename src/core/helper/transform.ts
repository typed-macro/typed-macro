import { Node, NodePath } from '@babel/traverse'
import template from '@babel/template'
import { ImportDeclaration, Program } from '@babel/types'
import { ImportOption, renderImportStmt } from './import'
import { findImported } from '@/core/helper/traverse'

// returns
// - array: generated import statements
// - path: all import statements are duplicated, returns the node path of the last one
// - undefined: none import statement provided
function normalizeImports(
  program: NodePath<Program>,
  imports: ImportOption | ImportOption[]
) {
  if (Array.isArray(imports)) {
    if (imports.length === 0) return
  } else {
    imports = [imports]
  }
  // remove duplicated
  const toBeImported = imports.filter(
    (imp) => !findImported(program, imp, false)
  )
  // all import statements are duplicated, returns the node path of the last one
  if (!toBeImported.length)
    return findImported(program, imports[imports.length - 1], false)!
  return template.statements.ast(
    Array.from(new Set(toBeImported.map((imp) => renderImportStmt(imp)))).join(
      '; '
    )
  ) as ImportDeclaration[]
}

export function prependImports(
  program: NodePath<Program>,
  imports: ImportOption | ImportOption[]
) {
  const toBeImported = normalizeImports(program, imports)
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

export function appendImports(
  program: NodePath<Program>,
  imports: ImportOption | ImportOption[]
) {
  const toBeImported = normalizeImports(program, imports)
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

export function prependToBody<Nodes extends Node | readonly Node[]>(
  program: NodePath<Program>,
  nodes: Nodes
) {
  return program.unshiftContainer('body', nodes).pop() as NodePath
}

export function appendToBody<Nodes extends Node | readonly Node[]>(
  program: NodePath<Program>,
  nodes: Nodes
) {
  return program.pushContainer('body', nodes).pop() as NodePath
}
