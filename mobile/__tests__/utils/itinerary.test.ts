import { toLeg, itineraryEndpoints, legsByDirection } from '../../src/utils/itinerary';
import type { CheckoutItinerary, Leg } from '../../src/types/itinerary';
import type { Trip } from '../../src/types/trip';

const trip: Trip = {
  id: 'rail:1', provider: 'rail', transportType: 'train', origin: 'LON', destination: 'PAR',
  departAt: '2030-06-15T08:00:00Z', arriveAt: '2030-06-15T10:30:00Z', durationMins: 150,
  priceEur: 50, stops: 0, deepLink: '',
};
const leg = (origin: string, destination: string, direction?: Leg['direction']): Leg => ({
  ...trip, origin, destination, originName: `${origin} name`, destinationName: `${destination} name`, direction,
});
const itin = (legs: Leg[]): CheckoutItinerary => ({ legs, connections: [], totalPriceEur: 0, adults: 1 });

describe('toLeg', () => {
  it('uses codes as names and tags the direction', () => {
    expect(toLeg(trip, 'return')).toMatchObject({ originName: 'LON', destinationName: 'PAR', direction: 'return' });
  });
});

describe('itineraryEndpoints', () => {
  it('one-way: first origin to last destination', () => {
    expect(itineraryEndpoints(itin([leg('BRI', 'LON'), leg('LON', 'PAR')]))).toEqual({
      origin: 'BRI', destination: 'PAR', originName: 'BRI name', destinationName: 'PAR name',
    });
  });

  it('round trip: outbound endpoints only, not back home', () => {
    const legs = [
      leg('BRI', 'LON', 'outbound'), leg('LON', 'PAR', 'outbound'),
      leg('PAR', 'LON', 'return'), leg('LON', 'BRI', 'return'),
    ];
    expect(itineraryEndpoints(itin(legs))).toMatchObject({ origin: 'BRI', destination: 'PAR' });
  });
});

describe('legsByDirection', () => {
  it('treats legs without a direction as outbound', () => {
    const groups = legsByDirection([leg('A', 'B'), leg('B', 'A', 'return')]);
    expect(groups.outbound).toHaveLength(1);
    expect(groups.return).toHaveLength(1);
  });
});
