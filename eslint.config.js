import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['client/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      // This codebase uses the standard "set a loading flag at the start of an
      // async fetch effect" pattern; the rule is too aggressive for it.
      'react-hooks/set-state-in-effect': 'off',
      // Small constants and hooks are intentionally co-located with the
      // components that use them.
      'react-refresh/only-export-components': 'off',
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['server/**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
])
