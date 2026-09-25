import AsyncStorage from '@react-native-async-storage/async-storage';
import { addRecentSearch, getRecentSearches, clearRecentSearches, type RecentSearch } from '../../src/utils/recentSearches';

const LON = { name: 'London', code: 'LON', country: 'UK' };
const PAR = { name: 'Paris', code: 'PAR', country: 'FR' };
const BER = { name: 'Berlin', code: 'BER', country: 'DE' };

const s = (from = LON, to = PAR, departDate = '2030-05-01'): RecentSearch => ({ from, to, departDate, adults: 1 });

beforeEach(() => AsyncStorage.clear());

describe('recent searches', () => {
  it('starts empty', async () => {
    expect(await getRecentSearches('a@x.com')).toEqual([]);
  });

  it('stores newest first and de-duplicates by route', async () => {
    await addRecentSearch('a@x.com', s(LON, PAR, '2030-05-01'));
    await addRecentSearch('a@x.com', s(LON, BER));
    await addRecentSearch('a@x.com', s(LON, PAR, '2030-06-01'));
    const list = await getRecentSearches('a@x.com');
    expect(list.map(r => `${r.to.code}:${r.departDate}`)).toEqual(['PAR:2030-06-01', 'BER:2030-05-01']);
  });

  it('keeps at most 6', async () => {
    const cities = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(c => ({ name: c, code: c, country: 'X' }));
    for (const c of cities) await addRecentSearch('a@x.com', s(LON, c));
    const list = await getRecentSearches('a@x.com');
    expect(list).toHaveLength(6);
    expect(list[0].to.code).toBe('H');
  });

  it('is scoped per user', async () => {
    await addRecentSearch('a@x.com', s());
    expect(await getRecentSearches('b@x.com')).toEqual([]);
  });

  it('clears', async () => {
    await addRecentSearch('a@x.com', s());
    await clearRecentSearches('a@x.com');
    expect(await getRecentSearches('a@x.com')).toEqual([]);
  });

  it('survives corrupt storage', async () => {
    await AsyncStorage.setItem('recent:a@x.com', '{not json');
    expect(await getRecentSearches('a@x.com')).toEqual([]);
  });
});
