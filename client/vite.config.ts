import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import basicSsl from '@vitejs/plugin-basic-ssl';  // for testing on https locally

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(), 
    basicSsl()
  ],
  server: {
    host: true,
    allowedHosts: [
      ".trycloudflare.com", // allow all CF tunnel subdomains
    ],
    proxy: {
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
      },
    },
    // headers: {
    //   // Required for SharedArrayBuffer (FFmpeg multi-threading)
    //   "Cross-Origin-Opener-Policy": "same-origin",
    //   "Cross-Origin-Embedder-Policy": "require-corp",
    // },
  },
  optimizeDeps: {
    // Prevents Vite from trying to pre-bundle the heavy WASM binaries
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
})
