// AppHeader uses useSafeAreaInsets; screens render without a SafeAreaProvider
// in tests, so use the library's official mock (insets = 0). The mock module
// exposes everything on its default export.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
