import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages serves a project site from /<repo>/. The deploy workflow sets
  // GITHUB_PAGES so other hosts (e.g. Vercel at the root domain) keep base '/'.
  base: process.env.GITHUB_PAGES ? '/sketchy/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
