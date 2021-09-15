import { defineMacro, defineMacroProvider } from 'vite-plugin-macro'
import { run } from './common'

export function provideEcho() {
  return defineMacroProvider({
    id: 'echo',
    exports: {
      '@echo': {
        macros: [echoMacro],
      },
      '@string': {
        macros: [reverseMacro],
      },
    },
  })
}

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
      moduleName: '@string',
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
