import { Modules } from '@typed-macro/core'
import { isString } from '@typed-macro/shared'

/** @internal */
export function createMockModules(): Modules {
  const container: Map<string, string> = new Map()

  function query(pattern: RegExp | string) {
    const result: string[] = []
    const checker = isString(pattern)
      ? (tag: string, id: string) => pattern === tag && result.push(id)
      : (tag: string, id: string) => pattern.test(tag) && result.push(id)
    container.forEach(checker)
    return result
  }

  return {
    getTag(id) {
      return container.get(id)
    },
    setTag(id, tag) {
      container.set(id, tag)
    },
    unsetTag(id) {
      container.delete(id)
    },
    queryByTag: query,
    invalidateByTag: query,
  }
}
