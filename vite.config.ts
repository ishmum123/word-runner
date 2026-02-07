import { defineConfig } from 'vite';

export default defineConfig({
  base: '/word-runner/',
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
