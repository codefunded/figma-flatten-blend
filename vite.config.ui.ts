import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
  plugins: [viteSingleFile()],
  root: path.resolve('src/ui'),
  build: {
    outDir: path.resolve('dist'),
    emptyOutDir: false,
    target: 'es2020',
    rollupOptions: {
      output: { entryFileNames: '[name].js' },
    },
  },
  resolve: {
    alias: { '@common': path.resolve('src/common') },
  },
});
