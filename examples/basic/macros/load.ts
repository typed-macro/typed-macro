import { defineMacro, defineMacroPlugin } from 'vite-plugin-macro'
import { join } from 'path'
import { run } from './common'
import glob from 'fast-glob'

export function pluginLoad() {
  return defineMacroPlugin({
    name: 'macro-load',
    typesPath: join(__dirname, 'load-macros.d.ts'),
    exports: {
      '@load': {
        macros: [tryMacro, loadMacro],
      },
    },
  })
}

const tryMacro = defineMacro('tryLoad')
  .withSignature('(glob: string): void')
  .withHandler(({ path, args, filepath }, { template }) => {
    const glob = run(() => {
      if (args.length === 0)
        throw new Error(`glob should not be undefined in tryLoad()`)
      const arg = args[0]
      if (!arg.isStringLiteral())
        throw new Error(`glob should be string literal in tryLoad()`)
      return arg.node.value
    })

    path.replaceWith(
      template.statement.ast(
        `console.log('load glob "${glob}" from "${filepath}"')`
      )
    )
  })

const loadMacro = defineMacro('load')
  .withSignature(
    '(glob: string): void',
    'provide a glob pattern to load assets'
  )
  .withHandler(({ path, args }, _, { appendImports, normalizePathPattern }) => {
    const pattern = run(() => {
      if (args.length === 0)
        throw new Error(`glob should not be undefined in load()`)
      const arg = args[0]
      if (!arg.isStringLiteral())
        throw new Error(`glob should be string literal in load()`)
      return arg.node.value
    })

    const { normalized, base, resolveImportPath } =
      normalizePathPattern(pattern)

    const imports = searchByGlob(normalized, base).map(resolveImportPath)

    appendImports(imports.map((imp) => ({ moduleName: imp })))

    path.remove()
  })

function searchByGlob(pattern: string, baseDir: string) {
  return glob.sync(pattern, {
    cwd: baseDir,
    ignore: ['**/node_modules/**'],
  })
}
