import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  envDir: rootDir,

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      input: {
        discover: resolve(rootDir, 'index.html'),
        backlog: resolve(rootDir, 'backlog/index.html'),
        deals: resolve(rootDir, 'deals/index.html'),
      },
    },
  },

  server: {
    port: 5174,
    strictPort: false,
    open: true,
  },

  preview: {
    port: 4174,
  },
});
