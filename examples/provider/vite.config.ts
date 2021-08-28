import { defineConfig } from 'vite'
import { vitePluginMacro } from 'vite-plugin-macro'
import { provideEcho, provideLoad } from './plugin'

const macros = vitePluginMacro().use(provideEcho(), provideLoad())

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [macros],
})
