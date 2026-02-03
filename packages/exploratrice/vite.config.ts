import { paraglideVitePlugin } from "@inlang/paraglide-js"
import tailwindcss from "@tailwindcss/vite"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/lib/paraglide",
      strategy: ["url"],
    }),
  ],
  optimizeDeps: {
    // Exclude Node.js-only entry points from @tricoteuses/assemblee
    // These modules use fs-extra and should only run on the server
    exclude: [
      "@tricoteuses/assemblee/loaders",
      "@tricoteuses/assemblee/git",
      "@tricoteuses/assemblee/parsers",
      "@tricoteuses/tisseuse/server",
    ],
  },
})
