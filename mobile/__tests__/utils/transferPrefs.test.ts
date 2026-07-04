import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTransferPrefs, saveTransferPrefs } from '../../src/utils/transferPrefs';

beforeEach(() => AsyncStorage.clear());

describe('transfer prefs', () => {
  it('round-trips prefs for a booking ref', async () => {
    await saveTransferPrefs('BK123', {
      startAddress: 'Savoy Hotel, London',
      endAddress: 'Hôtel Lutetia, Paris',
      travelMode: 'walking',
    });
    expect(await getTransferPrefs('BK123')).toEqual({
      startAddress: 'Savoy Hotel, London',
      endAddress: 'Hôtel Lutetia, Paris',
      travelMode: 'walking',
    });
  });

  it('returns null when nothing is stored', async () => {
    expect(await getTransferPrefs('NOPE')).toBeNull();
  });

  it('returns null for corrupt stored JSON', async () => {
    await AsyncStorage.setItem('transfer:BAD', '{not json');
    expect(await getTransferPrefs('BAD')).toBeNull();
  });
});
