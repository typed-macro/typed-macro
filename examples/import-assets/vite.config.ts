import { defineConfig } from 'vite'
import vitePluginImportAssets from './plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vitePluginImportAssets()],
})
