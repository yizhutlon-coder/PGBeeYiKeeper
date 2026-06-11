import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Relative base + single-file output so the production build is one self-contained
// index.html that works opened directly (file://) and inside Electron.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
});
