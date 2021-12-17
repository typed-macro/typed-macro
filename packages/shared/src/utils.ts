import { existsSync } from 'fs'
import { posix, resolve, sep, win32 } from 'path'
import { PackageManager } from './types'

export function validateFnName(name: string) {
  return /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/.test(name)
}

export function normalizePath(path: string) {
  return path.split(win32.sep).join(posix.sep)
}

export function isString(v: unknown): v is string {
  return typeof v === 'string'
}

export function isPromise(v: unknown): v is Promise<unknown> {
  return Promise.resolve(v) === v
}

export function isError(v: unknown): v is Error {
  return v instanceof Error
}

export function isArray(v: unknown): v is Array<any> {
  return Array.isArray(v)
}

export function isFunction(o: unknown): o is Function {
  return o instanceof Function
}

export function isAsyncFunction(fn: Function) {
  return fn.constructor.name.includes('Async')
}

export function isGeneratorFunction(fn: Function): fn is GeneratorFunction {
  return fn.constructor.name.includes('Generator')
}

/**
 * Get project paths.
 * Directory containing `./package.json` will be considered projects.
 *
 * If current path is under a subproject (for example, in a workspace),
 * the result will be like
 * `[currentProjectDirectory, parentProjectDirectory, ..., rootProjectDirectory]`.
 *
 * If no project directory is found, returns [cwd].
 */
export function getProjectPath() {
  const cwd = process.cwd()
  const paths = cwd.split(sep)
  const result = []
  for (let i = paths.length; i > 0; i--) {
    const path = paths.slice(0, i).join(sep)
    if (existsSync([path, 'package.json'].join(sep))) result.push(path)
  }
  /* istanbul ignore next */
  return result.length ? result : [cwd]
}

/**
 * Get used package manager according to the unique lock file of each package manager.
 *
 * - yarn.lock => yarn
 * - package-lock.json => npm
 * - pnpm-lock.yaml => pnpm
 * - _ => unknown
 */
/* istanbul ignore next */
export function getPackageManager(dir: string): PackageManager {
  if (existsSync(resolve(dir, 'yarn.lock'))) return 'yarn'
  if (existsSync(resolve(dir, 'package-lock.json'))) return 'npm'
  if (existsSync(resolve(dir, 'pnpm-lock.yaml'))) return 'pnpm'
  return 'unknown'
}

/* istanbul ignore next */
// eslint-disable-next-line
export const NO_OP = () => {}
