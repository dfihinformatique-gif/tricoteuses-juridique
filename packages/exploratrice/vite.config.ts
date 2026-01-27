import tailwindcss from "@tailwindcss/vite"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],

  optimizeDeps: {
    // Exclude Node.js-only entry points from @tricoteuses/assemblee
    // These modules use fs-extra and should only run on the server
    exclude: [
      "@tricoteuses/assemblee/loaders",
      "@tricoteuses/assemblee/git",
      "@tricoteuses/assemblee/parsers",
    ],
  },
})
