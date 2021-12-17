import { FSWatcher } from 'chokidar'
import { Host, PackageManager } from '@typed-macro/shared'

/**
 * Manage modules, users can set tag of a module and then query/invalidate
 * modules by the tag.
 */
export type Modules = {
  /**
   * Get the tag of specific module.
   * @param id module filepath, see {@link MacroTransformContext.filepath}.
   */
  getTag(id: string): string | undefined

  /**
   * Set tag for specific module.
   *
   * Note that one module can only have one tag, and the later tag override the earlier.
   *
   * @param id module filepath, see {@link MacroTransformContext.filepath}.
   * @param tag tag value
   */
  setTag(id: string, tag: string): void

  /**
   * Unset tag for specific module.
   * @param id module filepath, see {@link MacroTransformContext.filepath}.
   */
  unsetTag(id: string): void

  /**
   * Query modules having tags that match the pattern.
   *
   * @param pattern
   *   if string, a tag is matched when strictly equals to the pattern string;
   *   if RegExp, a tag is matched when pattern.test(tag) is true.
   */
  queryByTag(pattern: RegExp | string): string[]

  /**
   * Invalidate modules having tags that match the pattern.
   *
   * Use {@link Modules.queryByTag} to get the matched modules internally.
   */
  invalidateByTag(pattern: RegExp | string): string[]
}

export type EnvContext = {
  /**
   * The bundler/dev server in which macros/providers run.
   * @example 'vite'
   */
  host: Host

  /**
   * The package manager of the project to which macros/providers are applied.
   * @example 'yarn'
   */
  packageManager: PackageManager

  /**
   * The project path.
   *
   * If the current project is a subproject (for example, in a workspace),
   * the projectPath will be like
   * `[currentProjectDirectory, parentProjectDirectory, ..., rootProjectDirectory]`.
   */
  projectPath: string[]

  /**
   * Is in dev mode.
   *
   * Different {@link EnvContext.host} can have different judgment strategy.
   */
  dev: boolean

  /**
   * Is in SSR mode.
   *
   * Different {@link EnvContext.host} can have different judgment strategy.
   */
  ssr: boolean

  /**
   * An instance of chokidar's FSWatcher.
   *
   * It will be undefined in building process.
   */
  watcher?: FSWatcher

  /**
   * Used to manage modules.
   *
   * It will be undefined in building process.
   */
  modules?: Modules
}
