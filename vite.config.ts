/// <reference types="vite-react-ssg" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  ssgOptions: {
    // 'defer' (not 'async') so the entry runs AFTER the full document is parsed —
    // the inlined window.__staticRouterHydrationData at end of <body> must exist
    // before the router is created, or loader routes hydrate with no data.
    script: 'defer',
    formatting: 'none',
    // 'flat' emits dist/surah/2.html (not surah/2/index.html) so extensionless
    // hosts serve /surah/2 from the prerendered file instead of the SPA fallback.
    dirStyle: 'flat',
  },
})
