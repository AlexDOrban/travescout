// AppHeader uses useSafeAreaInsets; screens render without a SafeAreaProvider
// in tests, so use the library's official mock (insets = 0). The mock module
// exposes everything on its default export.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// Keep the api client from warning about a missing base URL in every suite.
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';

// Vector icons load their font asynchronously, which triggers act() warnings
// in every suite. Render the glyph name as plain text instead.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, testID }) => React.createElement(Text, { testID }, name);
  Icon.glyphMap = {};
  return { Ionicons: Icon };
});
