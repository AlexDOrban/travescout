import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import * as RN from 'react-native';
import { ThemeProvider, useTheme } from '../../src/contexts/ThemeContext';
import { DARK, LIGHT } from '../../src/constants/colors';
import { getItem, setItem } from '../../src/api/storage';

jest.mock('../../src/api/storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockGetItem = getItem as jest.Mock;
const mockSetItem = setItem as jest.Mock;

function Consumer() {
  const { isDark, colors, toggle, mode, setMode } = useTheme();
  return (
    <>
      <Text testID="mode">{isDark ? 'dark' : 'light'}</Text>
      <Text testID="pref">{mode}</Text>
      <Text testID="bg">{colors.background}</Text>
      <TouchableOpacity testID="toggle" onPress={toggle} />
      <TouchableOpacity testID="system" onPress={() => setMode('system')} />
    </>
  );
}

function mockScheme(scheme: 'light' | 'dark') {
  jest.spyOn(RN, 'useColorScheme').mockReturnValue(scheme);
}

afterEach(() => jest.restoreAllMocks());

describe('ThemeContext', () => {
  it('follows the OS appearance by default (dark)', () => {
    mockScheme('dark');
    const { getByTestId } = render(<ThemeProvider><Consumer /></ThemeProvider>);
    expect(getByTestId('pref').props.children).toBe('system');
    expect(getByTestId('mode').props.children).toBe('dark');
    expect(getByTestId('bg').props.children).toBe(DARK.background);
  });

  it('follows the OS appearance by default (light)', () => {
    mockScheme('light');
    const { getByTestId } = render(<ThemeProvider><Consumer /></ThemeProvider>);
    expect(getByTestId('mode').props.children).toBe('light');
    expect(getByTestId('bg').props.children).toBe(LIGHT.background);
  });

  it('toggle pins the opposite of the current appearance', () => {
    mockScheme('dark');
    const { getByTestId } = render(<ThemeProvider><Consumer /></ThemeProvider>);
    fireEvent.press(getByTestId('toggle'));
    expect(getByTestId('mode').props.children).toBe('light');
    expect(getByTestId('pref').props.children).toBe('light');
  });

  it('loads a persisted preference on mount', async () => {
    mockScheme('dark');
    mockGetItem.mockResolvedValueOnce('light');
    const { getByTestId } = render(<ThemeProvider><Consumer /></ThemeProvider>);
    await waitFor(() => {
      expect(getByTestId('mode').props.children).toBe('light');
    });
    expect(mockGetItem).toHaveBeenCalledWith('themePreference');
  });

  it('persists the preference on toggle and on returning to system', () => {
    mockScheme('dark');
    const { getByTestId } = render(<ThemeProvider><Consumer /></ThemeProvider>);
    fireEvent.press(getByTestId('toggle'));
    expect(mockSetItem).toHaveBeenCalledWith('themePreference', 'light');
    fireEvent.press(getByTestId('system'));
    expect(mockSetItem).toHaveBeenCalledWith('themePreference', 'system');
    expect(getByTestId('mode').props.children).toBe('dark');
  });
});
