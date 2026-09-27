import { defaultReturnDate, returnSearchQuery, returnsAfter, reversePrefs, RETURN_BUFFER_MINS } from '../../src/utils/roundTrip';
import { parseISODate } from '../../src/utils/format';
import type { Trip } from '../../src/types/trip';

const LON = { name: 'London', code: 'LON', country: 'UK' } as any;
const PAR = { name: 'Paris', code: 'PAR', country: 'FR' } as any;
// Local wall-clock time on a calendar day (tests run in any timezone).
const at = (iso: string, h: number, m = 0) => {
  const d = parseISODate(iso);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const trip = (departAt: string, arriveAt: string, id = 't'): Trip => ({
  id, provider: 'rail', transportType: 'train', origin: 'PAR', destination: 'LON',
  departAt, arriveAt, durationMins: 120, priceEur: 40, stops: 0, deepLink: '',
});

describe('defaultReturnDate', () => {
  it('is three days after departure', () => {
    expect(defaultReturnDate('2030-02-27')).toBe('2030-03-02');
  });
});

describe('returnSearchQuery', () => {
  const q = { from: LON, to: PAR, departDate: '2030-06-15', returnDate: '2030-06-18', adults: 2 };

  it('is null for one-way searches', () => {
    expect(returnSearchQuery({ ...q, returnDate: undefined }, null)).toBeNull();
  });

  it('swaps the cities and searches the return date', () => {
    const outbound = trip(at('2030-06-15', 8), at('2030-06-15', 11));
    expect(returnSearchQuery(q, outbound)).toEqual({ from: PAR, to: LON, departDate: '2030-06-18', adults: 2 });
  });

  it('moves to the outbound arrival day when an overnight outbound lands after the return date', () => {
    const outbound = trip(at('2030-06-15', 22), at('2030-06-16', 9));
    const sameDay = { ...q, returnDate: '2030-06-15' };
    expect(returnSearchQuery(sameDay, outbound)!.departDate).toBe('2030-06-16');
  });
});

describe('returnsAfter', () => {
  const outbound = trip(at('2030-06-15', 8), at('2030-06-15', 10));

  it(`hides returns departing less than ${RETURN_BUFFER_MINS} min after the outbound arrives`, () => {
    const tooSoon = trip(at('2030-06-15', 10, 30), at('2030-06-15', 12), 'soon');
    const ok = trip(at('2030-06-15', 11), at('2030-06-15', 13), 'ok');
    expect(returnsAfter([tooSoon, ok], outbound).map(t => t.id)).toEqual(['ok']);
  });

  it('keeps everything when no outbound is selected', () => {
    expect(returnsAfter([outbound], null)).toHaveLength(1);
  });
});

describe('reversePrefs', () => {
  it('swaps start and end, keeps the mode', () => {
    expect(reversePrefs({ startAddress: 'Home', endAddress: 'Hotel', travelMode: 'walking' })).toEqual({
      startAddress: 'Hotel', endAddress: 'Home', travelMode: 'walking',
    });
  });
});
