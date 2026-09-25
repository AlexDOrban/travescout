import { api } from './client';
import { SearchParams, SearchResponse } from '../types/trip';

export async function search(params: SearchParams): Promise<SearchResponse> {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    departDate: params.departDate,
  });
  query.set('adults', String(params.adults ?? 1));

  return api.get<SearchResponse>(`/search?${query.toString()}`);
}

export interface DayPrice {
  date: string;
  minPriceEur: number | null;
}

export async function searchPrices(params: {
  from: string;
  to: string;
  startDate: string;
  days: number;
  adults: number;
}): Promise<{ prices: DayPrice[] }> {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    startDate: params.startDate,
    days: String(params.days),
    adults: String(params.adults),
  });
  return api.get<{ prices: DayPrice[] }>(`/search/prices?${query.toString()}`);
}
