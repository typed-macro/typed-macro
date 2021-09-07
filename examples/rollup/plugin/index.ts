import { defineMacro, defineMacroPlugin } from 'vite-plugin-macro'
import { join } from 'path'

const run = <T>(block: () => T) => block()

export function macroPluginHello() {
  return defineMacroPlugin({
    name: 'macro-hello-plugin',
    typesPath: join(__dirname, './macros.d.ts'),
    exports: {
      '@hello': {
        macros: [helloMacro],
      },
    },
  })
}

const helloMacro = defineMacro('hello')
  .withSignature('(msg?: string): void')
  .withHandler(({ path, args }, { template, types }) => {
    const msg = run(() => {
      if (args.length === 0) return 'Rollup'
      const firstArg = args[0]
      if (!types.isStringLiteral(firstArg))
        throw new Error('please use literal string as message')
      return firstArg.value
    })

    path.replaceWith(template.statement.ast(`console.log("Hello, ${msg}")`))
  })
