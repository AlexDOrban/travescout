import { RankedTrip } from '../types/trip';
import { Passenger, BookingResponse } from '../types/booking';
import type { Leg, CheckoutItinerary, ItineraryBookingResponse, Direction, TripType } from '../types/itinerary';
import type { TransferPrefs } from '../utils/transferPrefs';
import { computeConnections } from '../utils/connections';

const EMPTY_TRANSFER: TransferPrefs = { startAddress: '', endAddress: '', travelMode: 'transit' };

let _trip: RankedTrip | null = null;
let _adults: number = 1;
let _passengers: Passenger[] = [];
let _bookingResult: BookingResponse | ItineraryBookingResponse | null = null;
let _itinerary: CheckoutItinerary | null = null;
interface DirectionLegs {
  main: Leg;
  departure?: Leg;
  arrival?: Leg;
}
// Main leg + optional feeders for each direction; the itinerary's flat leg
// list is always rebuilt from this, so either direction can be edited alone.
let _directions: Partial<Record<Direction, DirectionLegs>> = {};
let _tripType: TripType = 'one_way';
let _viaConnections = false;
let _transfer: TransferPrefs = EMPTY_TRANSFER;
// One idempotency key per checkout ATTEMPT (not per payment-screen mount), so
// backing out and re-entering payment reuses the same key — the server then
// replays the original booking instead of charging twice.
let _idempotencyKey: string | null = null;

function newIdempotencyKey(): string {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const DIRECTIONS: Direction[] = ['outbound', 'return'];

function rebuildItinerary(adults: number): void {
  const legs: Leg[] = [];
  for (const dir of DIRECTIONS) {
    const d = _directions[dir];
    if (!d) continue;
    for (const leg of [d.departure, d.main, d.arrival]) {
      if (leg) legs.push({ ...leg, direction: dir });
    }
  }
  _itinerary = {
    legs,
    connections: computeConnections(legs),
    totalPriceEur: legs.reduce((sum, leg) => sum + leg.priceEur, 0),
    adults,
    tripType: _tripType,
    viaConnections: _viaConnections,
  };
}

export function setCheckoutTrip(trip: RankedTrip, adults: number): void {
  _trip = trip;
  _adults = adults;
  _passengers = [];
  _bookingResult = null;
  // A stale itinerary from an abandoned "Add Connections" flow would
  // otherwise take precedence over this trip at review/payment.
  _itinerary = null;
  _directions = {};
  _tripType = 'one_way';
  _viaConnections = false;
  _transfer = EMPTY_TRANSFER;
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
  _directions = {};
  _tripType = 'one_way';
  _viaConnections = false;
  _transfer = EMPTY_TRANSFER;
  _idempotencyKey = null;
}

export function setCheckoutTransfer(transfer: TransferPrefs): void {
  _transfer = transfer;
}

export function getCheckoutTransfer(): TransferPrefs {
  return _transfer;
}

export function setCheckoutItinerary(
  mainLeg: Leg,
  adults: number,
  departureLeg?: Leg,
  arrivalLeg?: Leg,
): void {
  _directions = { outbound: { main: mainLeg, departure: departureLeg, arrival: arrivalLeg } };
  _tripType = 'one_way';
  _viaConnections = true;
  _adults = adults;
  rebuildItinerary(adults);
  _trip = null;
  _bookingResult = null;
  _transfer = EMPTY_TRANSFER;
  _idempotencyKey = newIdempotencyKey();
}

export function setCheckoutRoundTrip(outbound: Leg, ret: Leg, adults: number, viaConnections: boolean): void {
  _directions = { outbound: { main: outbound }, return: { main: ret } };
  _tripType = 'round_trip';
  _viaConnections = viaConnections;
  _adults = adults;
  _passengers = [];
  rebuildItinerary(adults);
  _trip = null;
  _bookingResult = null;
  _transfer = EMPTY_TRANSFER;
  _idempotencyKey = newIdempotencyKey();
}

// Same checkout attempt: the idempotency key is kept.
export function setDirectionConnections(direction: Direction, departureLeg?: Leg, arrivalLeg?: Leg): void {
  const d = _directions[direction];
  if (!d) return;
  _directions = { ..._directions, [direction]: { main: d.main, departure: departureLeg, arrival: arrivalLeg } };
  rebuildItinerary(_adults);
}

export function getDirectionConnections(direction: Direction): { departure?: Leg; arrival?: Leg } {
  const d = _directions[direction];
  if (!d) return {};
  return {
    ...(d.departure ? { departure: d.departure } : {}),
    ...(d.arrival ? { arrival: d.arrival } : {}),
  };
}

export function getCheckoutItinerary(): CheckoutItinerary | null {
  return _itinerary;
}

// The itinerary's leg order changes as connections are added; screens that
// need a direction's main leg must not derive it from legs[0].
export function getCheckoutMainLeg(direction: Direction = 'outbound'): Leg | null {
  return _directions[direction]?.main ?? null;
}
