import { EnvContext } from '@typed-macro/core'
import { getPackageManager, getProjectPath } from '@typed-macro/shared'

export function createEnvContext(dev: boolean, ssr: boolean): EnvContext {
  const projectPath = getProjectPath()
  const packageManager =
    projectPath.length > 0
      ? getPackageManager(projectPath[0])
      : /* istanbul ignore next */ 'unknown'

  return {
    host: 'vite',
    projectPath,
    packageManager,
    dev,
    ssr,
  }
}
