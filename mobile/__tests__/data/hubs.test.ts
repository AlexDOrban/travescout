import { getHubsForCity, getHubByCode, cityHasHub } from '../../src/data/hubs';

describe('Hub Data', () => {
  it('returns hubs for known city', () => {
    const hubs = getHubsForCity('BUD');
    expect(hubs.length).toBeGreaterThan(0);
    expect(hubs.find(h => h.type === 'airport')).toBeDefined();
  });

  it('returns empty for unknown city', () => {
    expect(getHubsForCity('ZZZ')).toEqual([]);
  });

  it('finds hub by code', () => {
    const hub = getHubByCode('BUD-APT');
    expect(hub?.type).toBe('airport');
    expect(hub?.cityCode).toBe('BUD');
  });

  it('cityHasHub checks if a code belongs to a city', () => {
    expect(cityHasHub('BUD', 'BUD-APT')).toBe(true);
    expect(cityHasHub('BUD', 'VIE-APT')).toBe(false);
  });
});
