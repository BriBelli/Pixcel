import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/pxs.js'),
      name: 'PXS',
      formats: ['es', 'umd', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'index.mjs';
        if (format === 'umd') return 'index.umd.js';
        return 'index.js';
      }
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        exports: 'named'
      }
    },
    sourcemap: true,
    minify: false // Keep readable for debugging
  }
});
