import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { AppHeader, HeaderIconButton } from '../../src/components/AppHeader';
import { LIGHT } from '../../src/constants/colors';

jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(() => true), back: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ isDark: false, colors: LIGHT });
});

describe('AppHeader', () => {
  it('renders the title and subtitle', () => {
    const { getByText } = render(<AppHeader title="London → Paris" subtitle="Tue 5 Feb · 1 adult" />);
    expect(getByText('London → Paris')).toBeTruthy();
    expect(getByText('Tue 5 Feb · 1 adult')).toBeTruthy();
  });

  it('goes back from the back button', () => {
    const { getByTestId } = render(<AppHeader title="X" showBack />);
    fireEvent.press(getByTestId('header-back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('hides the back button when there is nowhere to go', () => {
    (router.canGoBack as jest.Mock).mockReturnValue(false);
    const { queryByTestId } = render(<AppHeader title="X" showBack />);
    expect(queryByTestId('header-back')).toBeNull();
  });

  it('renders trailing actions', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AppHeader
        title="X"
        right={<HeaderIconButton icon="notifications-outline" onPress={onPress} testID="bell" accessibilityLabel="Watch price" />}
      />,
    );
    fireEvent.press(getByTestId('bell'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders a large title for tab roots', () => {
    const { getByText } = render(<AppHeader title="My Trips" large right={<Text>r</Text>} />);
    expect(getByText('My Trips')).toBeTruthy();
  });
});
