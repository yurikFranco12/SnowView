// Configuración de ESLint (formato "flat config") para todo el monorepo.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/target/**',
      '**/coverage/**',
      'src-tauri/gen/**',
      'docs/diseno/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    // Regla de capas: core/ es TypeScript puro y no puede depender de UI, plataforma ni de otras capas.
    files: ['packages/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-*',
                'react/*',
                '@tauri-apps/*',
                '@snowview/data',
                '@snowview/web',
              ],
              message:
                'core/ no puede importar UI, plataforma ni capas exteriores (UI → data → core).',
            },
          ],
        },
      ],
    },
  },
  {
    // data/ puede usar core/, pero nunca la UI ni Tauri.
    files: ['packages/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'react/*', '@tauri-apps/*', '@snowview/web'],
              message: 'data/ no puede importar la UI ni Tauri (UI → data → core).',
            },
          ],
        },
      ],
    },
  },
  {
    // La UI: navegador + reglas de hooks de React. Tauri solo se usa desde src/platform/.
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ['apps/web/src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@tauri-apps/*'],
              message: 'La UI no usa Tauri directamente: pasa por apps/web/src/platform/.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
