import { defineMacro, defineMacroProvider } from 'vite-plugin-macro'
import { run } from './common'

export function provideEcho() {
  return defineMacroProvider({
    id: 'echo',
    exports: {
      '@echo': {
        macros: [echoMacro],
      },
    },
  })
}

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
