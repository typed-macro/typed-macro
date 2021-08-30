import { defineConfig } from 'vite'
import { vitePluginMacro } from 'vite-plugin-macro'
import { provideEcho, provideLoad } from './plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vitePluginMacro().use(provideEcho()).use(provideLoad()).toPlugin()],
})
