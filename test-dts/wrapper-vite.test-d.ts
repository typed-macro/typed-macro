import { describe, expectType } from './utils'
import {
  createMacroPlugin,
  defineMacro,
  defineMacroProvider,
} from 'vite-plugin-macro'
import { Plugin } from 'vite'

describe('vite plugin macro', () => {
  expectType<Plugin>(createMacroPlugin())
  expectType<Plugin>(createMacroPlugin({}))

  const provider = defineMacroProvider({
    id: '',
    exports: {
      '@m': {
        macros: [
          defineMacro('')
            .withSignature('')
            .withHandler(({ path }) => path.remove()),
        ],
      },
    },
  })
  const plugin = createMacroPlugin()
  plugin.use(provider)
  plugin.use(provider, provider)
})
