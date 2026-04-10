import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve('src/plugin/code.ts'),
      formats: ['iife'],
      name: 'plugin',
      fileName: () => 'code.js',
    },
    outDir: path.resolve('dist'),
    emptyOutDir: false,
    target: 'es2020',
    rollupOptions: {
      output: { entryFileNames: 'code.js' },
    },
  },
  resolve: {
    alias: { '@common': path.resolve('src/common') },
  },
});
