import { matchCities, countryFlag, popularCities } from '../../src/data/cityMatch';

describe('matchCities', () => {
  it('matches name and code prefixes first', () => {
    expect(matchCities('lon')[0].code).toBe('LON');
    expect(matchCities('bcn')[0].name).toBe('Barcelona');
  });
  it('falls back to substring matches', () => {
    expect(matchCities('burg').map(c => c.name)).toContain('Hamburg');
  });
  it('matches by country code', () => {
    expect(matchCities('pt').map(c => c.code)).toEqual(expect.arrayContaining(['LIS', 'OPO']));
  });
  it('returns nothing for a blank query', () => {
    expect(matchCities('  ')).toEqual([]);
  });
});

describe('countryFlag', () => {
  it('maps UK to the GB flag', () => {
    expect(countryFlag('UK')).toBe('🇬🇧');
    expect(countryFlag('FR')).toBe('🇫🇷');
  });
});

it('has popular cities', () => {
  expect(popularCities().length).toBeGreaterThan(4);
});
