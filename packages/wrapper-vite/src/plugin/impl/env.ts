import { EnvContext, FSWatcher, WatchOptions } from '@typed-macro/core'
import { getPackageManager, getProjectPath } from '@typed-macro/shared'
import chokidar from 'chokidar'
import { createModules } from './modules'

export function createEnvContext(
  dev: boolean,
  ssr: boolean,
  watcherOptions?: WatchOptions
): EnvContext {
  const projectPath = getProjectPath()
  const packageManager =
    projectPath.length > 0
      ? getPackageManager(projectPath[0])
      : /* istanbul ignore next */ 'unknown'

  const watcher = dev
    ? (new chokidar.FSWatcher({
        ignoreInitial: true,
        ignorePermissionErrors: true,
        ...watcherOptions,
      }) as FSWatcher)
    : undefined

  const modules = dev ? createModules() : undefined

  return {
    host: 'vite',
    projectPath,
    packageManager,
    dev,
    ssr,
    watcher,
    modules,
  }
}
