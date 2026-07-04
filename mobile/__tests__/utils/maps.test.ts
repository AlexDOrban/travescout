import {
  resolveStopLabel,
  routeStops,
  googleMapsUrl,
  appleMapsUrl,
  groundSegments,
  segmentGoogleUrl,
  segmentAppleUrl,
} from '../../src/utils/maps';

describe('resolveStopLabel', () => {
  it('resolves an airport hub code to its name + country', () => {
    expect(resolveStopLabel('LHR')).toBe('London Heathrow, UK');
  });

  it('resolves a city code to its name + country', () => {
    expect(resolveStopLabel('PAR')).toBe('Paris, FR');
  });

  it('falls back to the raw code when unknown', () => {
    expect(resolveStopLabel('ZZZ')).toBe('ZZZ');
  });
});

describe('routeStops', () => {
  it('resolves and drops consecutive duplicates', () => {
    expect(routeStops(['LON', 'LON', 'PAR'])).toEqual(['London, UK', 'Paris, FR']);
  });

  it('skips empty codes', () => {
    expect(routeStops(['LON', '', 'PAR'])).toEqual(['London, UK', 'Paris, FR']);
  });
});

describe('googleMapsUrl', () => {
  it('builds an origin→destination directions URL', () => {
    const url = googleMapsUrl(['London, UK', 'Paris, FR']);
    expect(url).toContain('https://www.google.com/maps/dir/?api=1');
    expect(url).toContain('origin=London%2C%20UK');
    expect(url).toContain('destination=Paris%2C%20FR');
    expect(url).not.toContain('waypoints');
  });

  it('includes intermediate stops as waypoints', () => {
    const url = googleMapsUrl(['A', 'B', 'C']);
    expect(url).toContain('waypoints=B');
    expect(url).toContain('destination=C');
  });

  it('returns empty string with fewer than two stops', () => {
    expect(googleMapsUrl(['A'])).toBe('');
  });

  it('preselects transit as the travel mode by default', () => {
    expect(googleMapsUrl(['A', 'B'])).toContain('travelmode=transit');
  });

  it('accepts an explicit travel mode', () => {
    expect(googleMapsUrl(['A', 'B'], 'driving')).toContain('travelmode=driving');
  });
});

describe('appleMapsUrl', () => {
  it('builds a saddr/daddr URL for start and end', () => {
    const url = appleMapsUrl(['London, UK', 'B', 'Paris, FR']);
    expect(url).toContain('saddr=London%2C%20UK');
    expect(url).toContain('daddr=Paris%2C%20FR');
  });

  it('returns empty string with fewer than two stops', () => {
    expect(appleMapsUrl([])).toBe('');
  });

  it('preselects transit directions by default', () => {
    expect(appleMapsUrl(['A', 'B'])).toContain('dirflg=r');
  });

  it('accepts an explicit travel mode', () => {
    expect(appleMapsUrl(['A', 'B'], 'driving')).toContain('dirflg=d');
  });
});

describe('groundSegments', () => {
  it('merges consecutive ground legs into one segment and adds no airport segments', () => {
    const segments = groundSegments([
      { origin: 'BER', destination: 'LON', transportType: 'train' },
      { origin: 'LON', destination: 'PAR', transportType: 'bus' },
    ]);
    expect(segments).toEqual([
      { kind: 'ground', stops: ['Berlin, DE', 'London, UK', 'Paris, FR'] },
    ]);
  });

  it('replaces a flight leg with to-airport and from-airport segments', () => {
    const segments = groundSegments([
      { origin: 'BER', destination: 'LON', transportType: 'train' },
      { origin: 'LHR', destination: 'CDG', transportType: 'flight' },
      { origin: 'PAR', destination: 'ROM', transportType: 'bus' },
    ]);
    expect(segments).toEqual([
      { kind: 'ground', stops: ['Berlin, DE', 'London, UK'] },
      { kind: 'to-airport', stops: ['London, UK', 'London Heathrow, UK'] },
      { kind: 'from-airport', stops: ['Paris Charles de Gaulle, FR', 'Paris, FR'] },
      { kind: 'ground', stops: ['Paris, FR', 'Rome, IT'] },
    ]);
  });

  it('routes a standalone flight from current location to the airport and on to the city', () => {
    const segments = groundSegments([
      { origin: 'LHR', destination: 'CDG', transportType: 'flight' },
    ]);
    expect(segments).toEqual([
      { kind: 'to-airport', stops: ['London Heathrow, UK'], fromCurrentLocation: true },
      { kind: 'from-airport', stops: ['Paris Charles de Gaulle, FR', 'Paris, FR'] },
    ]);
  });

  it('skips a from-airport segment when the arrival airport city is unknown', () => {
    const segments = groundSegments([
      { origin: 'LHR', destination: 'ZZZ', transportType: 'flight' },
    ]);
    expect(segments).toEqual([
      { kind: 'to-airport', stops: ['London Heathrow, UK'], fromCurrentLocation: true },
    ]);
  });

  it('uses a typed start address instead of the current location for a first-leg flight', () => {
    const segments = groundSegments(
      [{ origin: 'LHR', destination: 'CDG', transportType: 'flight' }],
      { startAddress: 'Savoy Hotel, London' },
    );
    expect(segments[0]).toEqual({
      kind: 'to-airport',
      stops: ['Savoy Hotel, London', 'London Heathrow, UK'],
    });
  });

  it('routes from the arrival airport to a typed final destination', () => {
    const segments = groundSegments(
      [{ origin: 'LHR', destination: 'CDG', transportType: 'flight' }],
      { endAddress: 'Hôtel Lutetia, Paris' },
    );
    expect(segments[segments.length - 1]).toEqual({
      kind: 'from-airport',
      stops: ['Paris Charles de Gaulle, FR', 'Hôtel Lutetia, Paris'],
    });
  });

  it('adds access segments around ground legs for typed endpoints', () => {
    const segments = groundSegments(
      [{ origin: 'BER', destination: 'LON', transportType: 'train' }],
      { startAddress: 'Hotel Adlon, Berlin', endAddress: 'The Ritz, London' },
    );
    expect(segments).toEqual([
      { kind: 'ground', stops: ['Hotel Adlon, Berlin', 'Berlin, DE'] },
      { kind: 'ground', stops: ['Berlin, DE', 'London, UK'] },
      { kind: 'ground', stops: ['London, UK', 'The Ritz, London'] },
    ]);
  });
});

describe('segment URLs', () => {
  it('omits the origin for a current-location segment', () => {
    const seg = { kind: 'to-airport' as const, stops: ['London Heathrow, UK'], fromCurrentLocation: true };
    const g = segmentGoogleUrl(seg);
    expect(g).toContain('destination=London%20Heathrow%2C%20UK');
    expect(g).not.toContain('origin=');
    expect(g).toContain('travelmode=transit');
    const a = segmentAppleUrl(seg);
    expect(a).toContain('daddr=London%20Heathrow%2C%20UK');
    expect(a).not.toContain('saddr=');
    expect(a).toContain('dirflg=r');
  });

  it('builds normal directions for a two-stop segment', () => {
    const seg = { kind: 'ground' as const, stops: ['Berlin, DE', 'London, UK'] };
    expect(segmentGoogleUrl(seg)).toBe(googleMapsUrl(['Berlin, DE', 'London, UK']));
    expect(segmentAppleUrl(seg)).toBe(appleMapsUrl(['Berlin, DE', 'London, UK']));
  });
});
