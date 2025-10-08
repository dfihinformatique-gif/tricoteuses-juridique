// import { includeIgnoreFile } from "@eslint/compat"
import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import prettier from "eslint-config-prettier"
import svelte from "eslint-plugin-svelte"
import globals from "globals"
// import { fileURLToPath } from "node:url"
import ts from "typescript-eslint"
import svelteConfig from "./svelte.config.js"

// const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url))

export default defineConfig(
  // Doesn't work because .gitignore is in a parent directory:
  // includeIgnoreFile(gitignorePath),
  {
    name: "Ignore .gitignore patterns & shadcn-svelte files",
    ignores: [
      ".svelte-kit",
      "build",
      "components.json",
      "src/lib/components/ui/",
      "src/lib/utils.ts",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
      // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      "no-undef": "off",
      "svelte/no-at-html-tags": "off",
      "svelte/no-navigation-without-resolve": "off",
      "svelte/require-each-key": "off",
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
        svelteConfig,
      },
    },
  },
)
