import { resolveStopLabel, routeStops, googleMapsUrl, appleMapsUrl } from '../../src/utils/maps';

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
