import { defineMacro, defineMacroPlugin } from 'vite-plugin-macro'
import { join } from 'path'

const run = <T>(block: () => T) => block()

export function vitePluginBasic() {
  const echoMacro = defineMacro('echo')
    .withSignature('(msg: string): void')
    .withHandler(({ path, args }, { template }, { appendImports }) => {
      const msg = run(() => {
        if (args.length === 0) throw new Error('empty arguments is invalid')
        const firstArg = args[0]
        if (!firstArg.isStringLiteral())
          throw new Error('please use literal string as message')
        return firstArg.node.value
      })

      appendImports({
        moduleName: '@helper',
        exportName: 'log',
        localName: '__log',
      })

      path.replaceWith(template.statement.ast(`__log("${msg}")`))
    })

  return defineMacroPlugin({
    name: 'macro-test-plugin',
    typesPath: join(__dirname, '../macros.d.ts'),
    exports: {
      '@echo': {
        macros: [echoMacro],
      },
      '@helper': {
        customTypes: `export function log(msg: string): void;`,
        code: `export function log(msg) {console.log(msg)}`,
      },
    },
  })
}
