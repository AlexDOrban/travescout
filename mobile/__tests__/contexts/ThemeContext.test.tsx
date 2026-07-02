jest.mock('../../src/api/storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { ThemeProvider, useTheme } from '../../src/contexts/ThemeContext';
import { getItem, setItem } from '../../src/api/storage';

const mockGetItem = getItem as jest.Mock;
const mockSetItem = setItem as jest.Mock;

function Consumer() {
  const { isDark, colors, toggle } = useTheme();
  return (
    <>
      <Text testID="mode">{isDark ? 'dark' : 'light'}</Text>
      <Text testID="bg">{colors.background}</Text>
      <TouchableOpacity testID="toggle" onPress={toggle} />
    </>
  );
}

describe('ThemeContext', () => {
  it('defaults to dark mode', () => {
    const { getByTestId } = render(<ThemeProvider><Consumer /></ThemeProvider>);
    expect(getByTestId('mode').props.children).toBe('dark');
  });

  it('provides dark background colour', () => {
    const { getByTestId } = render(<ThemeProvider><Consumer /></ThemeProvider>);
    expect(getByTestId('bg').props.children).toBe('#0f172a');
  });

  it('toggles to light mode', () => {
    const { getByTestId } = render(<ThemeProvider><Consumer /></ThemeProvider>);
    fireEvent.press(getByTestId('toggle'));
    expect(getByTestId('mode').props.children).toBe('light');
  });

  it('light mode has white background', () => {
    const { getByTestId } = render(<ThemeProvider><Consumer /></ThemeProvider>);
    fireEvent.press(getByTestId('toggle'));
    expect(getByTestId('bg').props.children).toBe('#ffffff');
  });

  it('loads a persisted light preference on mount', async () => {
    mockGetItem.mockResolvedValueOnce('light');
    const { getByTestId } = render(<ThemeProvider><Consumer /></ThemeProvider>);
    await waitFor(() => {
      expect(getByTestId('mode').props.children).toBe('light');
    });
    expect(mockGetItem).toHaveBeenCalledWith('themePreference');
  });

  it('persists the preference on toggle', () => {
    const { getByTestId } = render(<ThemeProvider><Consumer /></ThemeProvider>);
    fireEvent.press(getByTestId('toggle'));
    expect(mockSetItem).toHaveBeenCalledWith('themePreference', 'light');
  });
});
