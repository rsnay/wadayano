import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  define: { global: 'globalThis' },
  plugins: [
    {
      name: 'jsx-in-js',
      enforce: 'pre',
      async transform(code, id) {
        if (!/\/src\/.*\.js$/.test(id)) return null;
        return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'transform' });
      },
    },
    react({ jsxRuntime: 'classic' }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
      resolveExtensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
  },
  resolve: { extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'] },
  build: { outDir: 'build' },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
      '/lti': 'http://127.0.0.1:8787',
    },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.js' },
});
