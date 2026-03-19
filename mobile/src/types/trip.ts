export interface Trip {
  id: string;
  provider: string;
  transportType: 'flight' | 'bus' | 'train';
  origin: string;
  destination: string;
  departAt: string;
  arriveAt: string;
  durationMins: number;
  priceEur: number;
  stops: number;
  deepLink: string;
}

export interface RankedTrip extends Trip {
  score: number;
  tags: ('CHEAPEST' | 'FASTEST' | 'BALANCED')[];
}

export interface SearchMeta {
  from: string;
  to: string;
  departDate: string;
  adults: number;
  providersQueried: string[];
  providersFailed: string[];
}

export interface SearchResponse {
  results: RankedTrip[];
  meta: SearchMeta;
}

export interface SearchParams {
  from: string;
  to: string;
  departDate: string;
  returnDate?: string;
  adults?: number;
}
