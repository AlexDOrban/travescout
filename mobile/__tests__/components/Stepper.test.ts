import { checkoutFlow, checkoutSteps, stepIndex } from '../../src/components/Stepper';
import type { CheckoutItinerary } from '../../src/types/itinerary';

const itin = (over: Partial<CheckoutItinerary> = {}): CheckoutItinerary => ({
  legs: [], connections: [], totalPriceEur: 0, adults: 1, ...over,
});

describe('checkoutFlow', () => {
  it('derives the flow from the itinerary', () => {
    expect(checkoutFlow(null)).toBe('one_way');
    expect(checkoutFlow(itin())).toBe('one_way_connections');
    expect(checkoutFlow(itin({ tripType: 'round_trip', viaConnections: false }))).toBe('round_trip');
    expect(checkoutFlow(itin({ tripType: 'round_trip', viaConnections: true }))).toBe('round_trip_connections');
  });
});

describe('checkoutSteps', () => {
  it('lists the steps for every flow', () => {
    expect(checkoutSteps('one_way')).toEqual(['Getting there', 'Passengers', 'Review', 'Pay']);
    expect(checkoutSteps('one_way_connections')).toEqual(['Connections', 'Getting there', 'Passengers', 'Review', 'Pay']);
    expect(checkoutSteps('round_trip')).toEqual(['Getting there', 'Passengers', 'Review', 'Pay']);
    expect(checkoutSteps('round_trip_connections')).toEqual([
      'Outbound connections', 'Return connections', 'Getting there', 'Passengers', 'Review', 'Pay',
    ]);
  });

  it('indexes a step within its flow', () => {
    expect(stepIndex('round_trip_connections', 'Passengers')).toBe(3);
    expect(stepIndex('one_way', 'Pay')).toBe(3);
  });
});
