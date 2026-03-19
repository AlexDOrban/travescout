import { api } from './client';
import type {
  ConnectionSearchResponse,
  ItineraryBookingRequest,
  ItineraryBookingResponse,
  ItinerariesResponse,
} from '../types/itinerary';

interface ConnectionSearchParams {
  hub: string;
  cityCode: string;
  direction: 'to' | 'from';
  dateTime: string;
  adults: number;
}

export async function searchConnections(params: ConnectionSearchParams): Promise<ConnectionSearchResponse> {
  const query = new URLSearchParams({
    hub: params.hub,
    cityCode: params.cityCode,
    direction: params.direction,
    dateTime: params.dateTime,
    adults: String(params.adults),
  });
  return api.get<ConnectionSearchResponse>(`/search/connections?${query.toString()}`);
}

export async function bookItinerary(request: ItineraryBookingRequest): Promise<ItineraryBookingResponse> {
  return api.post<ItineraryBookingResponse>('/book/itinerary', request);
}

export async function getItineraries(): Promise<ItinerariesResponse> {
  return api.get<ItinerariesResponse>('/itineraries');
}
