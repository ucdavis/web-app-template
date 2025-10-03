import nkzw from '@nkzw/eslint-config';
import pluginRouter from '@tanstack/eslint-plugin-router';
import pluginQuery from '@tanstack/eslint-plugin-query';

export default [
  ...pluginQuery.configs['flat/recommended'],
  ...pluginRouter.configs['flat/recommended'],
  ...nkzw,
  {
    ignores: ['dist/', 'vite.config.ts.timestamp-*'],
  },
];
