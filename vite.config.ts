import { defineConfig } from 'vite';

export default defineConfig({
  base: '/word-runner/',
  build: {
    // Phaser is ~1.2MB minified, increase limit to suppress warning
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
