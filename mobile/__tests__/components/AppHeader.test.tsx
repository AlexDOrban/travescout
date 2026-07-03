import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { AppHeader } from '../../src/components/AppHeader';

jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));
jest.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: jest.fn(),
}));

const mockToggle = jest.fn();
const mockSetCurrency = jest.fn();

const darkColors = {
  card: '#1e293b', text: '#f1f5f9', textSecondary: '#94a3b8',
  accent: '#6366f1', border: '#334155',
};

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ isDark: true, colors: darkColors, toggle: mockToggle });
  (useCurrency as jest.Mock).mockReturnValue({
    currency: { code: 'EUR', symbol: '€' },
    currencies: [
      { code: 'EUR', symbol: '€' },
      { code: 'USD', symbol: '$' },
      { code: 'GBP', symbol: '£' },
    ],
    setCurrency: mockSetCurrency,
  });
});

describe('AppHeader', () => {
  it('renders the title', () => {
    const { getByText } = render(<AppHeader title="TraveScout" />);
    expect(getByText('TraveScout')).toBeTruthy();
  });

  it('shows current currency code', () => {
    const { getByText } = render(<AppHeader title="TraveScout" />);
    expect(getByText('EUR')).toBeTruthy();
  });

  it('cycles to next currency when pill is pressed', () => {
    const { getByTestId } = render(<AppHeader title="TraveScout" />);
    fireEvent.press(getByTestId('currency-pill'));
    expect(mockSetCurrency).toHaveBeenCalledWith({ code: 'USD', symbol: '$' });
  });

  it('calls toggle when theme button is pressed', () => {
    const { getByTestId } = render(<AppHeader title="TraveScout" />);
    fireEvent.press(getByTestId('theme-toggle'));
    expect(mockToggle).toHaveBeenCalled();
  });

  it('shows sun emoji in dark mode', () => {
    const { getByText } = render(<AppHeader title="TraveScout" />);
    expect(getByText('☀️')).toBeTruthy(); // dark mode → show sun (to switch to light)
  });
});
