import { EnvContext } from '@typed-macro/core'
import { getPackageManager, getProjectPath } from '@typed-macro/shared'
import { FSWatcher, WatchOptions } from 'chokidar'
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
    ? new FSWatcher({
        ignored: ['**/node_modules/**', '**/.git/**'],
        ignoreInitial: true,
        ignorePermissionErrors: true,
        disableGlobbing: true,
        ...watcherOptions,
      })
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
