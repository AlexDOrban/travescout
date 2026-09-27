import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAlerts, addAlert, removeAlert, updateAlertPrice, findAlert, alertId, priceChange,
} from '../../src/utils/priceAlerts';

const LON = { name: 'London', code: 'LON', country: 'UK' };
const PAR = { name: 'Paris', code: 'PAR', country: 'FR' };
const base = { from: LON, to: PAR, departDate: '2030-05-01', adults: 1 };

beforeEach(() => AsyncStorage.clear());

describe('price alerts', () => {
  it('adds an alert with the current price as baseline', async () => {
    await addAlert('u', { ...base, priceEur: 40 });
    const [a] = await getAlerts('u');
    expect(a).toMatchObject({ id: alertId(base), baselinePriceEur: 40, lastPriceEur: 40 });
  });

  it('does not duplicate the same route/date/party', async () => {
    await addAlert('u', { ...base, priceEur: 40 });
    await addAlert('u', { ...base, priceEur: 35 });
    expect(await getAlerts('u')).toHaveLength(1);
  });

  it('finds and removes', async () => {
    await addAlert('u', { ...base, priceEur: 40 });
    expect(await findAlert('u', base)).toBeTruthy();
    await removeAlert('u', alertId(base));
    expect(await findAlert('u', base)).toBeNull();
  });

  it('updates the latest price but keeps the baseline', async () => {
    await addAlert('u', { ...base, priceEur: 40 });
    await updateAlertPrice('u', alertId(base), 32);
    const [a] = await getAlerts('u');
    expect(a.baselinePriceEur).toBe(40);
    expect(a.lastPriceEur).toBe(32);
    expect(a.lastCheckedAt).toBeTruthy();
  });

  it('is scoped per user', async () => {
    await addAlert('u', { ...base, priceEur: 40 });
    expect(await getAlerts('other')).toEqual([]);
  });
});

describe('priceChange', () => {
  it('reports drops, rises and no change', () => {
    expect(priceChange(40, 30)).toEqual({ direction: 'down', amount: 10 });
    expect(priceChange(40, 45)).toEqual({ direction: 'up', amount: 5 });
    expect(priceChange(40, 40)).toEqual({ direction: 'same', amount: 0 });
    expect(priceChange(40, null)).toEqual({ direction: 'unknown', amount: 0 });
  });
});
