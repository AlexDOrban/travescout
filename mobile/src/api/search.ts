import { api } from './client';
import { SearchParams, SearchResponse } from '../types/trip';

export async function search(params: SearchParams): Promise<SearchResponse> {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    departDate: params.departDate,
  });
  if (params.returnDate) query.set('returnDate', params.returnDate);
  query.set('adults', String(params.adults ?? 1));

  return api.get<SearchResponse>(`/search?${query.toString()}`);
}
