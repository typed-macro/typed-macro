import { defineConfig } from 'vite'
import { vitePluginMacro } from 'vite-plugin-macro'
import { join } from 'path'
import { provideEcho } from './macros/echo'
import { pluginLoad } from './macros/load'

const macroPlugin = vitePluginMacro({
  typesPath: join(__dirname, './macros.d.ts'),
})
  .use(provideEcho())
  .use(pluginLoad())
  .toPlugin()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [macroPlugin],
})
