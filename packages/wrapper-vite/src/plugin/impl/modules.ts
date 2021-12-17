import { Modules } from '@typed-macro/core'
import { isString } from '@typed-macro/shared'
import { ModuleNode, ViteDevServer } from 'vite'

export function createModules(server: ViteDevServer): Modules {
  const container: Map<string, string> = new Map()
  const queryByTag = (pattern: RegExp | string) => {
    const result: string[] = []
    const checker = isString(pattern)
      ? (tag: string, id: string) => pattern === tag && result.push(id)
      : (tag: string, id: string) => pattern.test(tag) && result.push(id)
    container.forEach(checker)
    return result
  }
  const invalidateByTag = (pattern: RegExp | string) => {
    const invalidatedFiles: string[] = []
    const seen: Set<ModuleNode> = new Set()
    for (const file of queryByTag(pattern)) {
      const module = server.moduleGraph.getModuleById(file)
      if (module) {
        invalidatedFiles.push(file)
        server.moduleGraph.invalidateModule(module, seen)
      } else {
        container.delete(file)
      }
    }
    return invalidatedFiles
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
    queryByTag,
    invalidateByTag,
  }
}
