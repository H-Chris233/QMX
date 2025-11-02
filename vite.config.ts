import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(async () => ({
  plugins: [vue()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      ignored: ['**/src-tauri/**', '**/backend/**'],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
}));
