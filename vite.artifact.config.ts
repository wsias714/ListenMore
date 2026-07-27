import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// One-off config for producing a single self-contained HTML file, used only
// to preview the app as a Claude Artifact (a real deploy uses vite.config.ts
// instead, with the PWA plugin and multi-file output).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-artifact',
    emptyOutDir: true,
    cssCodeSplit: false,
  },
})
