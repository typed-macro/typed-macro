import { mkdir, writeFile } from 'fs/promises'
import { dirname } from 'path'
import { NamespacedTypes } from './exports'

export type TypeRendererOptions = {
  types: NamespacedTypes
  typesPath: string
}

export type AppendedTypeUpdater = (type: string) => void

export type TypeRenderer = {
  render: () => string
  write: () => Promise<void>
  append: (namespace: string, type: string) => AppendedTypeUpdater
}

export function createTypeRenderer({
  types,
  typesPath,
}: TypeRendererOptions): TypeRenderer {
  return {
    render: () => renderTypes(types),
    write: async () => {
      try {
        await mkdir(dirname(typesPath), { recursive: true })
        await writeFile(typesPath, renderTypes(types))
      } catch (e) {
        throw new Error(`Error when write type declaration file: ${e}`)
      }
    },
    append: (namespace, type) => {
      let t = types[namespace]
      if (!t) {
        t = types[namespace] = {
          moduleScope: [],
          macroScope: [],
        }
      }
      const i = t.moduleScope.push(type) - 1
      return (s) => (t.moduleScope[i] = s)
    },
  }
}

export function renderTypes(types: NamespacedTypes) {
  const namespaces = Object.keys(types)
  return namespaces
    .map((ns) => {
      const item = types[ns]
      return `declare module '${ns}' {
${[item.moduleScope.join('\n'), item.macroScope.join('\n')]
  .filter((t) => !!t)
  .join('\n')}
}`
    })
    .join('\n')
}
