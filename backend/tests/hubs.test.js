const { getHubsForCity, getHubByCode, getAllCityCodes } = require('../src/data/hubs');

describe('Hub Data', () => {
  describe('getHubsForCity', () => {
    it('returns hubs for a known city', () => {
      const hubs = getHubsForCity('BUD');
      expect(hubs).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'airport', code: 'BUD-APT', cityCode: 'BUD' }),
        expect.objectContaining({ type: 'train_station', cityCode: 'BUD' }),
        expect.objectContaining({ type: 'bus_station', cityCode: 'BUD' }),
      ]));
    });

    it('returns empty array for unknown city', () => {
      expect(getHubsForCity('ZZZ')).toEqual([]);
    });

    it('has hubs for all 36 cities', () => {
      const codes = getAllCityCodes();
      expect(codes.length).toBe(36);
      codes.forEach(code => {
        const hubs = getHubsForCity(code);
        expect(hubs.length).toBeGreaterThan(0);
      });
    });

    it('every hub has required fields', () => {
      const codes = getAllCityCodes();
      codes.forEach(code => {
        getHubsForCity(code).forEach(hub => {
          expect(hub).toHaveProperty('type');
          expect(hub).toHaveProperty('code');
          expect(hub).toHaveProperty('name');
          expect(hub).toHaveProperty('cityCode', code);
          expect(hub).toHaveProperty('transferMins');
          expect(['airport', 'train_station', 'bus_station']).toContain(hub.type);
        });
      });
    });

    it('hub codes are globally unique', () => {
      const allCodes = new Set();
      getAllCityCodes().forEach(city => {
        getHubsForCity(city).forEach(hub => {
          expect(allCodes.has(hub.code)).toBe(false);
          allCodes.add(hub.code);
        });
      });
    });

    it('no hub code matches any city code', () => {
      const cityCodes = new Set(getAllCityCodes());
      getAllCityCodes().forEach(city => {
        getHubsForCity(city).forEach(hub => {
          expect(cityCodes.has(hub.code)).toBe(false);
        });
      });
    });
  });

  describe('getHubByCode', () => {
    it('returns hub by code', () => {
      const hub = getHubByCode('BUD-APT');
      expect(hub).toMatchObject({ type: 'airport', code: 'BUD-APT', cityCode: 'BUD' });
    });

    it('returns null for unknown code', () => {
      expect(getHubByCode('UNKNOWN')).toBeNull();
    });
  });
});
