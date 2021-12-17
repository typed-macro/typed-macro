import { EnvContext, Modules } from '@typed-macro/core'
import { FSWatcher, WatchOptions } from 'chokidar'
import { createMockModules } from './modules'

export type TestEnvContextOptions = Partial<
  Omit<EnvContext, 'watcher' | 'modules'>
> & {
  /**
   * Options for EnvContext.watcher.
   *
   * If is undefined, then EnvContext.watcher will be undefined.
   */
  watchOptions?: WatchOptions

  /**
   * Options for EnvContext.modules.
   *
   * If is true, then EnvContext.modules will be a mocked Modules.
   * If is undefined, then EnvContext.modules will be undefined.
   */
  modules?: boolean | Modules
}

/**
 * Create EnvContext for testing.
 *
 * Options will be merged with the default env.
 *
 * Default env:
 * ```typescript
 * {
 *    projectPath: ['/'],
 *    packageManager: 'test',
 *    host: 'test',
 *    dev: true,
 *    ssr: false,
 *    modules: undefined,
 *    watcher: undefined
 * }
 * ```
 */
export function createTestEnvContext({
  modules,
  watchOptions,
  ...env
}: TestEnvContextOptions = {}): EnvContext {
  return {
    projectPath: ['/'],
    packageManager: 'test',
    host: 'test',
    dev: true,
    ssr: false,
    modules: modules
      ? modules === true
        ? createMockModules()
        : modules
      : undefined,
    watcher: watchOptions && new FSWatcher(watchOptions),
    ...env,
  }
}
