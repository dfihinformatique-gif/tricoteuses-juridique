// import { includeIgnoreFile } from "@eslint/compat"
import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import prettier from "eslint-config-prettier"
import globals from "globals"
// import { fileURLToPath } from "node:url"
import ts from "typescript-eslint"

export default defineConfig(
  // Doesn't work because .gitignore is in a parent directory:
  // includeIgnoreFile(gitignorePath),
  {
    ignores: ["dist"],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-irregular-whitespace": "off",
      // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
      // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      "no-undef": "off",
    },
  },
)
