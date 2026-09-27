import type { Trip } from './trip';
import type { BookedTrip } from './booking';

export type Direction = 'outbound' | 'return';
export type TripType = 'one_way' | 'round_trip';

export interface Leg extends Trip {
  originName: string;
  destinationName: string;
  /** Absent means outbound (one-way itineraries). */
  direction?: Direction;
}

export interface Connection {
  transferMins: number;
  warning?: string;
  /** The gap between the outbound and the return — the stay, not a transfer. */
  stay?: boolean;
}

export interface CheckoutItinerary {
  legs: Leg[];
  connections: Connection[];
  totalPriceEur: number;
  adults: number;
  /** Absent means one-way. */
  tripType?: TripType;
  /** Round trips only: the user chose "Add Connections" (connection steps shown). */
  viaConnections?: boolean;
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
  passengers: { name: string; email: string }[];
  paymentMethodId: string;
  origin: string;
  destination: string;
  tripType?: TripType;
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
  trip_type?: TripType;
  legs: BookedTrip[];
}

export interface ItineraryBookingResponse {
  bookingRef: string;
  status: 'confirmed' | 'partially_failed';
  itinerary: BookedItinerary;
  failedLegs?: { legOrder: number; error: string }[];
}

export interface ItinerariesResponse {
  itineraries: BookedItinerary[];
}
