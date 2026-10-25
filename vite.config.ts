import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [vue()],
  css: {
    // Inline so Vite doesn't pick up a postcss config from a parent folder.
    postcss: { plugins: [tailwindcss({ config: './tailwind.config.js' }), autoprefixer()] },
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    rollupOptions: {
      external: ['vue', 'reka-ui'],
    },
  },
})
