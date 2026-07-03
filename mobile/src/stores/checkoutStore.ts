import { RankedTrip } from '../types/trip';
import { Passenger, BookingResponse } from '../types/booking';
import type { Leg, CheckoutItinerary, ItineraryBookingResponse } from '../types/itinerary';
import { computeConnections } from '../utils/connections';

let _trip: RankedTrip | null = null;
let _adults: number = 1;
let _passengers: Passenger[] = [];
let _bookingResult: BookingResponse | ItineraryBookingResponse | null = null;
let _itinerary: CheckoutItinerary | null = null;
let _mainLeg: Leg | null = null;
// One idempotency key per checkout ATTEMPT (not per payment-screen mount), so
// backing out and re-entering payment reuses the same key — the server then
// replays the original booking instead of charging twice.
let _idempotencyKey: string | null = null;

function newIdempotencyKey(): string {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function setCheckoutTrip(trip: RankedTrip, adults: number): void {
  _trip = trip;
  _adults = adults;
  _passengers = [];
  _bookingResult = null;
  // A stale itinerary from an abandoned "Add Connections" flow would
  // otherwise take precedence over this trip at review/payment.
  _itinerary = null;
  _mainLeg = null;
  _idempotencyKey = newIdempotencyKey();
}

export function getCheckoutTrip(): RankedTrip | null {
  return _trip;
}

export function getCheckoutAdults(): number {
  return _adults;
}

export function setPassengers(passengers: Passenger[]): void {
  _passengers = passengers;
}

export function getPassengers(): Passenger[] {
  return _passengers;
}

export function setBookingResult(result: BookingResponse | ItineraryBookingResponse): void {
  _bookingResult = result;
}

export function getBookingResult(): BookingResponse | ItineraryBookingResponse | null {
  return _bookingResult;
}

export function getCheckoutIdempotencyKey(): string | null {
  return _idempotencyKey;
}

export function clearCheckout(): void {
  _trip = null;
  _adults = 1;
  _passengers = [];
  _bookingResult = null;
  _itinerary = null;
  _mainLeg = null;
  _idempotencyKey = null;
}

export function setCheckoutItinerary(
  mainLeg: Leg,
  adults: number,
  departureLeg?: Leg,
  arrivalLeg?: Leg,
): void {
  const legs: Leg[] = [];
  if (departureLeg) legs.push(departureLeg);
  legs.push(mainLeg);
  if (arrivalLeg) legs.push(arrivalLeg);

  const connections = computeConnections(legs);
  const totalPriceEur = legs.reduce((sum, leg) => sum + leg.priceEur, 0);

  _itinerary = { legs, connections, totalPriceEur, adults };
  _mainLeg = mainLeg;
  _adults = adults;
  _trip = null;
  _bookingResult = null;
  _idempotencyKey = newIdempotencyKey();
}

export function getCheckoutItinerary(): CheckoutItinerary | null {
  return _itinerary;
}

// The itinerary's leg order changes as connections are added; screens that
// need the original main leg must not derive it from legs[0].
export function getCheckoutMainLeg(): Leg | null {
  return _mainLeg;
}
