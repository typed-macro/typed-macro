import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import refSugar from './plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), refSugar()],
})
