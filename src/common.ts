import { Node } from '@babel/types'

export const nodeLoc = (node: Node) =>
  node.loc
    ? `line ${node.loc.start.line}, column ${node.loc.start.column}`
    : 'unknown'

export const validateFnName = (name: string) =>
  /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/.test(name)

export const findDuplicatedItem = <T>(a: T[], b: T[]) => {
  for (const item of a) {
    if (b.includes(item)) return item
  }
  return undefined
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

export type FlatOptions<T extends object> = UnionToIntersection<T[keyof T]>

export type DeepPartial<T, RT = Required<T>> = {
  [P in keyof RT]?: RT[P] extends Array<infer I> ? Array<I> : DeepPartial<RT[P]>
}

export const promise = Promise.resolve()

// CI throws error `Cannot find module 'util/types' from 'src/*.ts'`,
// so implement some functions in 'util/types' here

export function isPromise(v: unknown): v is Promise<unknown> {
  return Promise.resolve(v) === v
}

export function isError(v: unknown): v is Error {
  return v instanceof Error
}

export function isFunction(o: unknown): o is Function {
  return o instanceof Function
}

export function isAsyncFunction(fn: object) {
  if (!fn.constructor) return false
  return fn.constructor.name.includes('Async')
}

export function isGeneratorFunction(fn: object): fn is GeneratorFunction {
  if (!fn.constructor) return false
  return fn.constructor.name.includes('Generator')
}
