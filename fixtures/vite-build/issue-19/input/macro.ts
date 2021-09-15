import { defineMacro } from '@/defineMacro'

const run = <T>(block: () => T) => block()

export const echoMacro = defineMacro('echo')
  .withSignature('(msg: string): void')
  .withHandler(({ path, args }, { template }) => {
    const msg = run(() => {
      if (args.length === 0) throw new Error('empty arguments is invalid')
      const firstArg = args[0]
      if (!firstArg.isStringLiteral())
        throw new Error('please use literal string as message')
      return firstArg.node.value
    })

    path.replaceWith(template.statement.ast`console.log("${msg}")`)
  })

export const reverseMacro = defineMacro('reverse')
  .withSignature('(msg: string): string')
  .withHandler(function* ({ path, args }, { types }) {
    yield args
    const msg = run(() => {
      if (args.length === 0) throw new Error('empty arguments is invalid')
      const firstArg = args[0]
      if (!firstArg.isStringLiteral())
        throw new Error('please use literal string as message')
      return firstArg.node.value
    })

    path.replaceWith(types.stringLiteral(msg.split('').reverse().join('')))
  })
