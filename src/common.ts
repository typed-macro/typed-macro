import { File, Program, Node } from '@babel/types'
import traverse, { NodePath } from '@babel/traverse'

export const nodeLoc = (node: Node) =>
  node.loc
    ? `line ${node.loc.start.line}, column ${node.loc.start.column}`
    : 'unknown'

export const validateFnName = (name: string) =>
  /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/.test(name)

export const findProgramPath = (ast: File) => {
  let path: NodePath<Program>
  traverse(ast, {
    Program(p) {
      path = p
      p.stop()
    },
  })
  return path!
}

/* eslint-disable @typescript-eslint/no-empty-function */
export const NO_OP = () => {}

export const findDuplicatedItem = <T>(a: T[], b: T[]) => {
  for (const item of a) {
    if (b.includes(item)) return item
  }
  return undefined
}
