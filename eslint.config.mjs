import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  ignores: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/pnpm-lock.yaml',
    '**/*.lock',
    'apps/web/next-env.d.ts',
  ],
});
