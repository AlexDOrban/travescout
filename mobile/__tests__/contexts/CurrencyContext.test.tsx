import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { CurrencyProvider, useCurrency } from '../../src/contexts/CurrencyContext';

// Mock fetch so we don't hit the Frankfurter API in tests
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ rates: { USD: 1.1, GBP: 0.85 } }),
}) as jest.Mock;

function Consumer() {
  const { currency, format, currencies } = useCurrency();
  return (
    <>
      <Text testID="code">{currency.code}</Text>
      <Text testID="symbol">{currency.symbol}</Text>
      <Text testID="formatted">{format(18)}</Text>
      <Text testID="count">{currencies.length}</Text>
    </>
  );
}

describe('CurrencyContext', () => {
  it('defaults to EUR', () => {
    const { getByTestId } = render(<CurrencyProvider><Consumer /></CurrencyProvider>);
    expect(getByTestId('code').props.children).toBe('EUR');
    expect(getByTestId('symbol').props.children).toBe('€');
  });

  it('formats EUR amount correctly', () => {
    const { getByTestId } = render(<CurrencyProvider><Consumer /></CurrencyProvider>);
    expect(getByTestId('formatted').props.children).toBe('€18.00');
  });

  it('exposes 3 currencies', () => {
    const { getByTestId } = render(<CurrencyProvider><Consumer /></CurrencyProvider>);
    expect(getByTestId('count').props.children).toBe(3);
  });
});
