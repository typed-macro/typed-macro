import { File, Program } from '@babel/types'
import traverse, { NodePath } from '@babel/traverse'

export const findInSet = <T>(_set: Set<T>, predicate: (o: T) => boolean) => {
  for (const e of _set) {
    if (predicate(e)) return e
  }
  return undefined
}

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
