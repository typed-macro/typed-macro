import { defineMacro } from '@/defineMacro'
import { defineMacroPlugin } from '@/defineMacroPlugin'
import { join } from 'path'

const run = <T>(block: () => T) => block()

const echoMacro = defineMacro('echoReverse')
  .withSignature('(msg: string): void')
  .withHandler(function* ({ path, args }, { template }, { prependImports }) {
    // expand arguments
    yield args

    const getMsg = () => {
      if (args.length === 0) throw new Error('empty arguments is invalid')
      const firstArg = args[0]
      if (!firstArg.isStringLiteral())
        throw new Error('please use literal string as message')
      return firstArg.node.value
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
  .withHandler(({ path, args }, { types }) => {
    const msg = run(() => {
      if (args.length === 0) throw new Error('empty arguments is invalid')
      const firstArg = args[0]
      if (!firstArg.isStringLiteral())
        throw new Error('please use literal string as message')
      return firstArg.node.value
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
