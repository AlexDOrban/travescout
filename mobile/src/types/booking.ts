export interface Passenger {
  name: string;
  email: string;
}

export interface BookingRequest {
  trip: {
    /** Offer id from search — the server re-quotes the authoritative price by this. */
    id: string;
    provider: string;
    origin: string;
    destination: string;
    departAt: string;
    arriveAt: string;
    priceEur: number;
    deepLink: string;
  };
  passengers: Passenger[];
  paymentMethodId: string;
  /** Client-generated key so a retried request can't double-charge. */
  idempotencyKey?: string;
}

export interface BookedTrip {
  id: string;
  provider: string;
  booking_ref: string;
  origin: string;
  destination: string;
  depart_at: string;
  arrive_at?: string | null;
  return_at: string | null;
  price_eur: string; // backend returns string from PostgreSQL numeric
  currency_display: string;
  status: string;
  raw_ticket_url: string | null;
  created_at: string;
  itinerary_id?: string;
  leg_order?: number;
  ticket_qr_data?: string;
}

export interface BookingResponse {
  bookingRef: string;
  status: string;
  trip: BookedTrip;
}

export interface TripsResponse {
  trips: BookedTrip[];
}
