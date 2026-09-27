import type { Trip } from '../types/trip';
import type { CheckoutItinerary, Direction, Leg } from '../types/itinerary';

// Search results carry codes only; use them as display names like the rest of checkout.
export function toLeg(trip: Trip, direction?: Direction): Leg {
  return { ...trip, originName: trip.origin, destinationName: trip.destination, ...(direction ? { direction } : {}) };
}

export function legsByDirection<T extends { direction?: Direction }>(legs: T[]): { outbound: T[]; return: T[] } {
  return {
    outbound: legs.filter(l => (l.direction ?? 'outbound') === 'outbound'),
    return: legs.filter(l => l.direction === 'return'),
  };
}

// Where the trip goes: for a round trip that is the outbound's start and end,
// never legs[0] → legs[last] (which would read "London → London").
export function itineraryEndpoints(it: CheckoutItinerary): {
  origin: string;
  destination: string;
  originName: string;
  destinationName: string;
} {
  const outbound = legsByDirection(it.legs).outbound;
  const first = outbound[0] ?? it.legs[0];
  const last = outbound[outbound.length - 1] ?? it.legs[it.legs.length - 1];
  return {
    origin: first.origin,
    destination: last.destination,
    originName: first.originName,
    destinationName: last.destinationName,
  };
}
