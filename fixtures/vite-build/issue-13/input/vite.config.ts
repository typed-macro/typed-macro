import { defineConfig } from 'vite'
import { defineMacroPlugin } from '@/defineMacroPlugin'
import { defineMacro } from '@/defineMacro'
import { join } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    defineMacroPlugin({
      name: 'test',
      typesPath: join(__dirname, 'macros.d.ts'),
      exports: {
        '@test': {
          macros: [
            defineMacro('test')
              .withSignature(`(): void`)
              .withHandler(({ path }) => path.remove()),
          ],
        },
      },
    }),
  ],
})
