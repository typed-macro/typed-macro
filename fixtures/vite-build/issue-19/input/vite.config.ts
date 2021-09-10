import { defineConfig } from 'vite'
import { defineMacroPlugin } from '@/defineMacroPlugin'
import { join } from 'path'
import { echoMacro, reverseMacro } from './macro'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    defineMacroPlugin({
      name: 'test',
      typesPath: join(__dirname, 'macros.d.ts'),
      exports: {
        '@issue-19': {
          macros: [reverseMacro, echoMacro],
        },
      },
    }),
  ],
})
