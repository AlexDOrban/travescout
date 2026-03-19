import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Currency {
  code: 'EUR' | 'USD' | 'GBP';
  symbol: string;
}

const CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
];

// Fallback rates if Frankfurter API is unavailable
const FALLBACK_RATES: Record<string, number> = { EUR: 1, USD: 1.08, GBP: 0.86 };

interface CurrencyContextValue {
  currency: Currency;
  currencies: Currency[];
  setCurrency: (c: Currency) => void;
  rates: Record<string, number>;
  convert: (amountEur: number) => number;
  format: (amountEur: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  useEffect(() => {
    fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP')
      .then(r => r.json())
      .then(data => setRates({ EUR: 1, ...data.rates }))
      .catch(() => {}); // keep fallback on network error
  }, []);

  function convert(amountEur: number): number {
    return Math.round(amountEur * (rates[currency.code] ?? 1) * 100) / 100;
  }

  function format(amountEur: number): string {
    return `${currency.symbol}${convert(amountEur).toFixed(2)}`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, currencies: CURRENCIES, setCurrency, rates, convert, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
