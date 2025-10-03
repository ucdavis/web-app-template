import nkzw from '@nkzw/eslint-config';
import pluginRouter from '@tanstack/eslint-plugin-router';

export default [
  ...pluginRouter.configs['flat/recommended'],
  ...nkzw,
  {
    ignores: ['dist/', 'vite.config.ts.timestamp-*'],
  },
];
