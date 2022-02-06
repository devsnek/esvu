'use strict';

module.exports = {
  root: true,
  extends: 'airbnb-base',
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script',
    requireConfigFile: false,
  },
  env: {
    es6: true,
    node: true,
  },
  rules: {
    'strict': ['error', 'global'],
    'indent': ['error', 2, {
      SwitchCase: 1,
      FunctionDeclaration: {
        parameters: 'first',
      },
      FunctionExpression: {
        parameters: 'first',
      },
      CallExpression: {
        arguments: 'first',
      },
    }],
    'no-bitwise': 'off',
    'no-iterator': 'off',
    'global-require': 'off',
    'quote-props': ['error', 'consistent-as-needed'],
    'brace-style': ['error', '1tbs', { allowSingleLine: false }],
    'curly': ['error', 'all'],
    'no-param-reassign': 'off',
    'arrow-parens': ['error', 'always'],
    'no-multi-assign': 'off',
    'no-underscore-dangle': 'off',
    'no-restricted-syntax': 'off',
    'object-curly-newline': 'off',
    'prefer-const': ['error', { destructuring: 'all' }],
    'class-methods-use-this': 'off',
    'implicit-arrow-linebreak': 'off',
    'lines-between-class-members': 'off',
    'import/no-dynamic-require': 'off',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: true,
    }],
    'import/extensions': 'off',
    'import/prefer-default-export': 'off',
    'max-classes-per-file': 'off',
  },
};
