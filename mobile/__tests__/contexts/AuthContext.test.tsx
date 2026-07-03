import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import * as authApi from '../../src/api/auth';
import { getItem } from '../../src/api/storage';

jest.mock('../../src/api/auth');
jest.mock('../../src/api/storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  deleteItem: jest.fn().mockResolvedValue(undefined),
}));

const mockLogin = authApi.login as jest.Mock;
const mockRegister = authApi.register as jest.Mock;
const mockLogout = authApi.logout as jest.Mock;
const mockGetItem = getItem as jest.Mock;

function Consumer() {
  const { user, login, register, logout } = useAuth();
  return (
    <>
      <Text testID="user">{user ? user.email : 'none'}</Text>
      <TouchableOpacity testID="login" onPress={() => login('a@b.com', 'pass')} />
      <TouchableOpacity testID="register" onPress={() => register('new@b.com', 'pass')} />
      <TouchableOpacity testID="logout" onPress={logout} />
    </>
  );
}

beforeEach(() => jest.clearAllMocks());

describe('AuthContext', () => {
  it('starts with no user when no token stored', async () => {
    mockGetItem.mockResolvedValue(null);
    const { getByTestId } = render(<AuthProvider><Consumer /></AuthProvider>);
    await act(async () => {});
    expect(getByTestId('user').props.children).toBe('none');
  });

  it('restores session when token and email are stored', async () => {
    // getItem called with 'accessToken' then 'userEmail' (Promise.all order)
    mockGetItem
      .mockResolvedValueOnce('existing-token')  // accessToken
      .mockResolvedValueOnce('stored@b.com');   // userEmail
    const { getByTestId } = render(<AuthProvider><Consumer /></AuthProvider>);
    await act(async () => {});
    expect(getByTestId('user').props.children).toBe('stored@b.com');
  });

  it('sets user after login', async () => {
    mockLogin.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
    const { getByTestId } = render(<AuthProvider><Consumer /></AuthProvider>);
    await act(async () => { fireEvent.press(getByTestId('login')); });
    expect(getByTestId('user').props.children).toBe('a@b.com');
  });

  it('sets user after register', async () => {
    mockRegister.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
    const { getByTestId } = render(<AuthProvider><Consumer /></AuthProvider>);
    await act(async () => { fireEvent.press(getByTestId('register')); });
    expect(getByTestId('user').props.children).toBe('new@b.com');
  });

  it('clears user after logout', async () => {
    mockLogin.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
    mockLogout.mockResolvedValue(undefined);
    mockGetItem.mockResolvedValueOnce(null).mockResolvedValueOnce('rt');
    const { getByTestId } = render(<AuthProvider><Consumer /></AuthProvider>);
    await act(async () => { fireEvent.press(getByTestId('login')); });
    await act(async () => { fireEvent.press(getByTestId('logout')); });
    expect(getByTestId('user').props.children).toBe('none');
  });
});
