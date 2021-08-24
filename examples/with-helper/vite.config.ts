import { defineConfig } from 'vite'
import { vitePluginBasic } from './plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vitePluginBasic()],
})
