import { defineMacro } from '@/defineMacro'

const run = <T>(block: () => T) => block()

export const echoMacro = defineMacro('echo')
  .withSignature('(msg: string): void')
  .withHandler(
    ({ path, args }, { template, types }, { yieldToNestedMacros }) => {
      yieldToNestedMacros()
      const msg = run(() => {
        if (args.length === 0) throw new Error('empty arguments is invalid')
        const firstArg = args[0]
        if (!types.isStringLiteral(firstArg))
          throw new Error('please use literal string as message')
        return firstArg.value
      })

      path.replaceWith(template.statement.ast`console.log("${msg}")`)
    }
  )

export const reverseMacro = defineMacro('reverse')
  .withSignature('(msg: string): string')
  .withHandler(({ path, args }, { types }, { yieldToNestedMacros }) => {
    yieldToNestedMacros()
    const msg = run(() => {
      if (args.length === 0) throw new Error('empty arguments is invalid')
      const firstArg = args[0]
      if (!types.isStringLiteral(firstArg))
        throw new Error('please use literal string as message')
      return firstArg.value
    })

    path.replaceWith(types.stringLiteral(msg.split('').reverse().join('')))
  })
