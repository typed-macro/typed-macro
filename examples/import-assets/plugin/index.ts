import { join } from 'path'
import glob from 'fast-glob'
import { defineMacro, defineMacroPlugin } from 'vite-plugin-macro'

export default function vitePluginImportAssets() {
  const importMacro = defineMacro('importAssets')
    .withSignature(
      '(glob: string): void',
      'provide a glob pattern to import assets'
    )
    .withHandler(
      (
        { path, args },
        { types },
        { prependImports, normalizePathPattern, run }
      ) => {
        const pattern = run(() => {
          if (args.length === 0)
            throw new Error(
              `glob should not be undefined in load() around ${path.getSource()}`
            )
          const arg = args[0]
          if (!types.isStringLiteral(arg))
            throw new Error(
              `glob should be string literal in load() around ${path.getSource()}`
            )
          return arg.value
        })

        const { normalized, base, resolveImportPath } =
          normalizePathPattern(pattern)

        const imports = searchByGlob(normalized, base).map(resolveImportPath)

        prependImports(
          imports.map((imp) => ({
            moduleName: imp,
          }))
        )

        path.remove()
      }
    )

  return defineMacroPlugin({
    name: 'plugin-import-assets',
    exports: {
      '@import-assets': {
        macros: [importMacro],
      },
    },
    dtsPath: join(__dirname, '../client.d.ts'),
    parserPlugins: ['topLevelAwait'],
  })
}

function searchByGlob(pattern: string, baseDir: string) {
  return glob.sync(pattern, {
    cwd: baseDir,
    ignore: ['**/node_modules/**'],
  })
}
