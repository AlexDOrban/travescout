import type { Trip } from './trip';
import type { BookedTrip } from './booking';

export interface Leg extends Trip {
  originName: string;
  destinationName: string;
}

export interface Connection {
  transferMins: number;
  warning?: string;
}

export interface CheckoutItinerary {
  legs: Leg[];
  connections: Connection[];
  totalPriceEur: number;
  adults: number;
}

export interface ConnectionSearchResponse {
  connections: Leg[];
  meta: {
    hub: string;
    cityCode: string;
    direction: 'to' | 'from';
    referenceTime: string;
    providersQueried: string[];
    providersFailed: string[];
  };
}

export interface ItineraryBookingRequest {
  legs: Leg[];
  passengers: Array<{ name: string; email: string }>;
  paymentMethodId: string;
  origin: string;
  destination: string;
  /** Client-generated key so a retried request can't double-charge. */
  idempotencyKey?: string;
}

export interface BookedItinerary {
  id: string;
  booking_ref: string;
  origin: string;
  destination: string;
  depart_at: string;
  arrive_at: string;
  total_price_eur: string;
  status: string;
  legs: BookedTrip[];
}

export interface ItineraryBookingResponse {
  bookingRef: string;
  status: 'confirmed' | 'partially_failed';
  itinerary: BookedItinerary;
  failedLegs?: Array<{ legOrder: number; error: string }>;
}

export interface ItinerariesResponse {
  itineraries: BookedItinerary[];
}
