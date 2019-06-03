module.exports = {
  env: {
    node: true,
  },
  extends: 'eslint:all',
  parserOptions: {
    ecmaVersion: 6,
  },
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    indent: ['error', 2],
    'max-classes-per-file': 'off',
    'no-bitwise': 'off',
    'no-extra-parens': ['error', 'all', { nestedBinaryExpressions: false }],
    'no-magic-numbers': 'off',
    'no-shadow': ['error', { 'allow': ['error'] }],
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'object-curly-spacing': ['error', 'always'],
    'one-var': ['error', 'never'],
    'padded-blocks': ['error', 'never'],
    'quote-props': ['error', 'as-needed'],
    quotes: ['error', 'single']
  },
};
