import { defineMacro } from '../src'

// macro name: dev
export const createMacroRemoveOnProd = () =>
  defineMacro('dev')
    .withSignature('(v: unknown): void')
    .withHandler(({ path, dev, args }) => {
      if (!dev || args.length === 0) {
        path.remove()
        return
      }
      path.replaceWith(args[0])
    })

// macro name: noop
export const createMacroRemove = () =>
  defineMacro('noop')
    .withSignature('(v: unknown): void')
    .withHandler(({ path }) => path.remove())
