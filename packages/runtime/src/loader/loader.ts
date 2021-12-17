import { ModularizedModules } from '../normalizer'

export type Loader = {
  /**
   * Append code into specific module.
   *
   * When code is undefined, use empty module `export {}` by default.
   *
   * Note that one module can only have one code,
   * and appending code for one module twice will raise an exception.
   */
  append(moduleName: string, code?: string): void

  /**
   * Get the code in specific module.
   */
  load(moduleName: string): string | undefined
}

export function createLoader(): Loader {
  const modules: ModularizedModules = Object.create(null)
  return {
    append: (moduleName, code) => {
      if (modules[moduleName]) {
        throw new Error(`duplicated virtual module '${moduleName}'`)
      }
      if (code === undefined) modules[moduleName] = 'export {}'
      else modules[moduleName] = code
    },
    load: (moduleName) => modules[moduleName],
  }
}
