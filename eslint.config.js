// ESLint v9+ config (ESM)
import prettier from 'eslint-plugin-prettier'

export default [
  {
    ignores: ['**/manifesto.js', 'node_modules/**', '.git/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        CustomEvent: 'readonly',
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'prefer-const': 'warn',
      'quotes': ['warn', 'single'],
      'semi': ['warn', 'never'],
      'arrow-body-style': ['warn', 'as-needed'],
      'object-shorthand': ['warn', 'always'],
      'eqeqeq': ['warn', 'always'],
      'no-var': 'error',
      'prettier/prettier': 'warn',
    },
  },
]
