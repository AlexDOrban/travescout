const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['jest.setup.js'],
    languageOptions: {
      globals: { jest: 'readonly', process: 'readonly', require: 'readonly' },
    },
  },
  {
    ignores: ['node_modules/', 'ios/', 'android/', '.expo/'],
  },
]);
