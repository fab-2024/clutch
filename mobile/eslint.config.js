const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['.expo/**', 'dist/**', 'node_modules/**'],
    rules: {
      // These React Compiler diagnostics reject established React Native data-
      // loading and Reanimated patterns. Keep the standard hooks correctness
      // rules enabled while the screens are migrated incrementally.
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
