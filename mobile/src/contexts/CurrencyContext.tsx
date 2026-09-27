import React, { createContext, useContext, useState, useEffect } from 'react';
import { getItem, setItem } from '../api/storage';

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
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  useEffect(() => {
    // Guard against state updates after unmount (also silences act() noise in tests).
    let cancelled = false;

    fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        // Only accept positive numeric rates; a changed/erroring payload used
        // to replace the fallbacks with {EUR: 1}, showing USD/GBP at par.
        const live: Record<string, number> = {};
        for (const [code, rate] of Object.entries(data?.rates ?? {})) {
          if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) live[code] = rate;
        }
        if (!cancelled) setRates({ ...FALLBACK_RATES, ...live, EUR: 1 });
      })
      .catch(() => {}); // keep fallback on network error

    getItem('currencyPreference')
      .then(stored => {
        const match = CURRENCIES.find(c => c.code === stored);
        if (match && !cancelled) setCurrencyState(match);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  function setCurrency(c: Currency): void {
    setCurrencyState(c);
    setItem('currencyPreference', c.code).catch(() => {});
  }

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
