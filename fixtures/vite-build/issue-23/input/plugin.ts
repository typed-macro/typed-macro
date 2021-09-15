import { defineMacro } from '@/defineMacro'
import { defineMacroPlugin } from '@/defineMacroPlugin'
import { join } from 'path'

const run = <T>(block: () => T) => block()

const echoMacro = defineMacro('echoReverse')
  .withSignature('(msg: string): void')
  .withHandler(function* (
    { path, args },
    { template, types },
    { prependImports }
  ) {
    // expand arguments
    yield path.get('arguments')

    const getMsg = () => {
      if (args.length === 0) throw new Error('empty arguments is invalid')
      const firstArg = args[0]
      if (!types.isStringLiteral(firstArg))
        throw new Error('please use literal string as message')
      return firstArg.value
    }

    // collect __reverse()
    yield prependImports({
      moduleName: '@issue-23',
      exportName: 'reverse',
      localName: '__reverse',
    })

    // expand __reverse()
    yield path
      .get('arguments')[0]
      .replaceWith(template.expression.ast(`__reverse("${getMsg()}")`))

    path.replaceWith(template.statement.ast`console.log("${getMsg()}")`)
  })

const reverseMacro = defineMacro('reverse')
  .withSignature('(msg: string): string')
  .withHandler(function* ({ path, args }, { types }) {
    yield path.get('arguments')
    const msg = run(() => {
      if (args.length === 0) throw new Error('empty arguments is invalid')
      const firstArg = args[0]
      if (!types.isStringLiteral(firstArg))
        throw new Error('please use literal string as message')
      return firstArg.value
    })

    path.replaceWith(types.stringLiteral(msg.split('').reverse().join('')))
  })

export const plugin = defineMacroPlugin({
  name: 'test',
  typesPath: join(__dirname, 'macros.d.ts'),
  exports: {
    '@issue-23': {
      macros: [reverseMacro, echoMacro],
    },
  },
})
