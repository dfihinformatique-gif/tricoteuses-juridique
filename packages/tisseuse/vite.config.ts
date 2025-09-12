import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  build: {
    target: "esnext", // Target ES2020
    outDir: "dist",
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      // entry: resolve(__dirname, 'src/index.ts'), // if single entry
      entry: {
        index: resolve(__dirname, "src/lib/index.ts"),
      },
      name: "@tricoteuses/tisseuse", // The global variable name if not using module systems
      // the proper extensions will be added
      // fileName: 'tricoteuses-assemblee', // if single entry and specific name
      formats: ["es"], // Output ESM
    },
    rollupOptions: {
      // Ensure dependencies are not bundled
      external: [
        // Node built-ins
        "node:assert",
        "node:path",
        // Dependencies from package.json
      ],
      output: {
        // Preserve module structure for entry points (if possible with multiple entries)
        // This helps in getting cleaner output file names like cleaners.js, loaders.js etc.
        // instead of just index.js for everything.
        // For multiple entry points, Vite uses the key from `lib.entry` as the file name.
        // e.g. lib.entry: { Mymodule: 'src/mymodule.js'} -> Mymodule.js
        // So, the names defined in `entry` above will be used.
      },
    },
  },
  plugins: [
    dts({
      outDir: "dist", // Output directory for declaration files
      // By default, dts will try to put them next to JS files.
      // Specifying outDir explicitly can sometimes help,
      // or use `insertTypesEntry: true` if you want a single d.ts entry for all.
      // For multiple entry points, it should generate corresponding .d.ts files.
      // e.g. index.d.ts, cleaners.d.ts
      // We want separate .d.ts files for each entry point if possible.
      // The default behavior of vite-plugin-dts with multiple library entries
      // should produce separate .d.ts files.
    }),
  ],
  resolve: {
    alias: {
      $lib: resolve(__dirname, "./src/lib"),
    },
  },
  test: { exclude: ["node_modules/"] },
})
