import { computeConnections, needsDepartureConnection, needsArrivalConnection } from '../../src/utils/connections';
import type { Leg } from '../../src/types/itinerary';

const makeLeg = (overrides: Partial<Leg>): Leg => ({
  id: 'test:1', provider: 'flixbus', transportType: 'bus',
  origin: 'BUD', destination: 'VIE', originName: 'Budapest', destinationName: 'Vienna',
  departAt: '2030-06-15T08:00:00Z', arriveAt: '2030-06-15T10:30:00Z',
  durationMins: 150, priceEur: 15, stops: 0, deepLink: '',
  ...overrides,
});

describe('computeConnections', () => {
  it('returns empty for single leg', () => {
    expect(computeConnections([makeLeg({})])).toEqual([]);
  });

  it('computes transfer time between two legs', () => {
    const legs = [
      makeLeg({ arriveAt: '2030-06-15T10:30:00Z', transportType: 'bus' }),
      makeLeg({ departAt: '2030-06-15T14:00:00Z' }),
    ];
    const conns = computeConnections(legs);
    expect(conns).toHaveLength(1);
    expect(conns[0].transferMins).toBe(210);
    expect(conns[0].warning).toBeUndefined();
  });

  it('warns on tight connection after flight', () => {
    const legs = [
      makeLeg({ arriveAt: '2030-06-15T10:00:00Z', transportType: 'flight' }),
      makeLeg({ departAt: '2030-06-15T11:00:00Z' }),
    ];
    const conns = computeConnections(legs);
    expect(conns[0].warning).toMatch(/Tight connection/);
  });

  it('warns on tight connection after bus (< 45 min)', () => {
    const legs = [
      makeLeg({ arriveAt: '2030-06-15T10:00:00Z', transportType: 'bus' }),
      makeLeg({ departAt: '2030-06-15T10:30:00Z' }),
    ];
    const conns = computeConnections(legs);
    expect(conns[0].warning).toMatch(/Tight connection/);
  });
});

describe('needsDepartureConnection', () => {
  it('returns true when origin city does not match departure hub', () => {
    expect(needsDepartureConnection('BUD', 'VIE-APT')).toBe(true);
  });

  it('returns false when origin city has the departure hub', () => {
    expect(needsDepartureConnection('BUD', 'BUD-APT')).toBe(false);
  });
});

describe('needsArrivalConnection', () => {
  it('returns true when destination city does not match arrival hub', () => {
    expect(needsArrivalConnection('NCE', 'LYS-APT')).toBe(true);
  });

  it('returns false when destination city has the arrival hub', () => {
    expect(needsArrivalConnection('NCE', 'NCE-APT')).toBe(false);
  });
});
