import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Bundle everything - no external dependencies for Chrome extension
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // Ensure no inline scripts or styles
        inlineDynamicImports: false,
      },
    },
    // Disable inline scripts for Chrome extension compatibility
    inlineDynamicImports: false,
    // Ensure proper module format
    target: 'es2020',
    minify: 'esbuild',
    // Disable CSS code splitting to avoid inline styles
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
