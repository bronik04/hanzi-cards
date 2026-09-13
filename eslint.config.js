import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'coverage',
      'playwright-report',
      'test-results',
      // Файлы прототипа: удаляются в задаче 19 вместе с этими строками.
      'main.js',
      'deck.js',
      'deck.test.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // В eslint-plugin-react-hooks 7 флэт-конфиг лежит в configs.flat;
  // configs['recommended-latest'] — это ещё eslintrc-форма с plugins-массивом.
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Служебные скрипты сборки: чистый Node, без браузерных глобальных переменных.
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    // Машинная проверка границы слоёв: критерий 9 из спека.
    files: ['src/core/**/*.ts'],
    ignores: ['src/core/**/*.test.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/core must not touch the DOM' },
        { name: 'document', message: 'src/core must not touch the DOM' },
        { name: 'localStorage', message: 'pass a StorageLike parameter instead' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react',
            'react-dom',
            'react/*',
            '@/components/*',
            '@/screens/*',
            '@/hooks/*',
            '@/state/*',
          ],
        },
      ],
    },
  },
);
