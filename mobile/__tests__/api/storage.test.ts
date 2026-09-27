// Mock Platform before importing storage
import * as SecureStore from 'expo-secure-store';
import { setItem, getItem, deleteItem } from '../../src/api/storage';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue('stored-value'),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('storage (iOS)', () => {
  it('setItem calls SecureStore.setItemAsync', async () => {
    await setItem('token', 'abc');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token', 'abc');
  });

  it('getItem calls SecureStore.getItemAsync', async () => {
    const val = await getItem('token');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('token');
    expect(val).toBe('stored-value');
  });

  it('deleteItem calls SecureStore.deleteItemAsync', async () => {
    await deleteItem('token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
  });
});
