import { mkdir, writeFile } from 'fs/promises'
import { dirname } from 'path'
import { ModularizedTypes } from '../normalizer'

export type TypeRenderer = {
  /**
   * Render types into string.
   */
  renderToString(): string
  /**
   * Render types into file.
   */
  renderToFile(path: string): Promise<void>
  /**
   * Append types into specific module.
   */
  append(moduleName: string, types: string[]): void
}

export function createTypeRenderer(): TypeRenderer {
  const types: ModularizedTypes = Object.create(null)
  return {
    renderToString: () => renderTypes(types),
    renderToFile: async (path) => {
      try {
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, renderTypes(types))
      } catch (e) {
        /* istanbul ignore next */
        /* This error is raised only when the file system has problems like
         * permissions,
         * which cannot be easily tested.
         */
        throw new Error(`Error when write type declaration file: ${e}`)
      }
    },
    append: (moduleName, ts) => {
      const t = types[moduleName] || (types[moduleName] = [])
      t.push(...ts)
    },
  }
}

function renderTypes(types: ModularizedTypes) {
  const moduleNames = Object.keys(types)
  return moduleNames
    .map((moduleName) => {
      const item = types[moduleName]
      return `declare module '${moduleName}' {
${item.join('\n')}
}`
    })
    .join('\n')
}
