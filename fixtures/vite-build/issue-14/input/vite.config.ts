import { defineConfig } from 'vite'
import { defineMacroPlugin } from '@/defineMacroPlugin'
import { defineMacro } from '@/defineMacro'
import { join } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'inline',
    rollupOptions: {
      output: {
        sourcemapPathTransform: () => 'index.ts',
      },
    },
  },
  plugins: [
    defineMacroPlugin({
      name: 'test',
      typesPath: join(__dirname, 'macros.d.ts'),
      exports: {
        '@issue-14': {
          macros: [
            defineMacro('test')
              .withSignature(`(): string`)
              .withHandler(({ path }, { template }) =>
                path.replaceWith(template.expression.ast(`'Hello World'`))
              ),
          ],
        },
      },
    }),
  ],
})
