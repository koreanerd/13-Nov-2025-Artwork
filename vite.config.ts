import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', // Root is current directory
  build: {
    outDir: 'dist',
  },
  server: {
    open: true,
  },
});
