import { ModuleNode, ViteDevServer } from 'vite'

export type DevServerHelper = {
  /**
   * Invalidate caches of modules that import macros from specific namespace,
   * only available in dev mode.
   *
   * This is usually used when, the macro needs to be re-expanded due to
   * the change of external conditions, while the modules that call
   * the macro cannot be automatically reloaded because their dependencies
   * in the module dependency graph have no change so Vite always caches them.
   */
  invalidateCache: (namespace: string) => void
  /**
   * Find modules that import macros from specific namespace,
   * only available in dev mode.
   */
  findImporters: (namespace: string) => Set<ModuleNode>
}

export function getDevServerHelper(server: ViteDevServer): DevServerHelper {
  function findImporters(ns: string) {
    // prefix `/@id/` is added by plugin `vite:import-analysis`
    // see:
    // https://github.com/vitejs/vite/blob/da0abc59935/packages/vite/src/node/plugins/importAnalysis.ts#L214
    return new Set(server.moduleGraph.getModuleById(`/@id/${ns}`)?.importers)
  }

  function invalidateCache(ns: string) {
    findImporters(ns)?.forEach((m) => server.moduleGraph.invalidateModule(m))
  }

  return {
    findImporters,
    invalidateCache,
  }
}
