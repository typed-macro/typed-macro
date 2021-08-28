import { defineMacro, defineMacroPlugin } from 'vite-plugin-macro'
import { join } from 'path'

const run = <T>(block: () => T) => block()

export function vitePluginBasic() {
  const echoMacro = defineMacro('echo')
    .withSignature('(msg: string, repeat?: number): void')
    .withHandler(({ path, args }, { template, types }) => {
      const msg = run(() => {
        if (args.length === 0) throw new Error('empty arguments is invalid')
        const firstArg = args[0]
        if (!types.isStringLiteral(firstArg))
          throw new Error('please use literal string as message')
        return firstArg.value
      })

      const repeat = run(() => {
        if (args.length < 2) return 5
        const secondArg = args[1]
        if (!types.isNumericLiteral(secondArg))
          throw new Error('please use literal number as repeat')
        return secondArg.value
      })

      path.replaceWith(
        template.statement.ast`console.log("${Array.from(
          { length: repeat },
          () => msg
        ).join(' ')}")`
      )
    })

  return defineMacroPlugin({
    name: 'macro-test-plugin',
    typesPath: join(__dirname, './macros.d.ts'),
    exports: {
      '@echo': {
        macros: [echoMacro],
      },
    },
  })
}
