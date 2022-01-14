import { Modules } from '@typed-macro/core'
import { isString } from '@typed-macro/shared'
import { ModuleNode, ViteDevServer } from 'vite'

/** @internal */
export type InternalModules = Modules & {
  __setServer: (server: ViteDevServer) => void
}

export function createModules(_server?: ViteDevServer): InternalModules {
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
      const module = _server?.moduleGraph.getModuleById(file)
      if (module) {
        invalidatedFiles.push(file)
        _server?.moduleGraph.invalidateModule(module, seen)
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
    __setServer: (server) => (_server = server),
  }
}
