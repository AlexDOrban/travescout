import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
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
  it('defaults to EUR', async () => {
    const { getByTestId } = render(<CurrencyProvider><Consumer /></CurrencyProvider>);
    await act(async () => {});
    expect(getByTestId('code').props.children).toBe('EUR');
    expect(getByTestId('symbol').props.children).toBe('€');
  });

  it('formats EUR amount correctly', async () => {
    const { getByTestId } = render(<CurrencyProvider><Consumer /></CurrencyProvider>);
    await act(async () => {});
    expect(getByTestId('formatted').props.children).toBe('€18.00');
  });

  it('exposes 3 currencies', async () => {
    const { getByTestId } = render(<CurrencyProvider><Consumer /></CurrencyProvider>);
    await act(async () => {});
    expect(getByTestId('count').props.children).toBe(3);
  });
});

describe('CurrencyContext rates', () => {
  function Usd() {
    const { rates, setCurrency, currencies, format } = useCurrency();
    return (
      <>
        <Text testID="usd-rate">{String(rates.USD)}</Text>
        <Text testID="usd-format">{format(100)}</Text>
        <Text testID="switch" onPress={() => setCurrency(currencies[1])}>x</Text>
      </>
    );
  }

  it('keeps fallback rates when the API returns an unexpected payload', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'not found' }) });
    const { getByTestId } = render(<CurrencyProvider><Usd /></CurrencyProvider>);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await act(async () => {});
    expect(getByTestId('usd-rate').props.children).toBe('1.08');
  });

  it('ignores non-numeric rates and a non-OK response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ rates: { USD: 'x' } }) });
    const { getByTestId } = render(<CurrencyProvider><Usd /></CurrencyProvider>);
    await act(async () => {});
    expect(getByTestId('usd-rate').props.children).toBe('1.08');
  });

  it('uses live rates when valid', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ rates: { USD: 1.2, GBP: 0.9 } }) });
    const { getByTestId } = render(<CurrencyProvider><Usd /></CurrencyProvider>);
    await waitFor(() => expect(getByTestId('usd-rate').props.children).toBe('1.2'));
    fireEvent.press(getByTestId('switch'));
    expect(getByTestId('usd-format').props.children).toBe('$120.00');
  });
});
