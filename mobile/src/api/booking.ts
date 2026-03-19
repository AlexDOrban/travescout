import { api } from './client';
import { BookingRequest, BookingResponse, TripsResponse } from '../types/booking';

export async function book(request: BookingRequest): Promise<BookingResponse> {
  return api.post<BookingResponse>('/book', request);
}

export async function getTrips(): Promise<TripsResponse> {
  return api.get<TripsResponse>('/trips');
}
