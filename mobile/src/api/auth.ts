import { api } from './client';
import { setItem, deleteItem } from './storage';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>('/auth/login', { email, password });
  await setItem('accessToken', data.accessToken);
  await setItem('refreshToken', data.refreshToken);
  await setItem('userEmail', email);
  return data;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>('/auth/register', { email, password });
  await setItem('accessToken', data.accessToken);
  await setItem('refreshToken', data.refreshToken);
  await setItem('userEmail', email);
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await api.post('/auth/logout', { refreshToken });
  } catch {
    // always clear local tokens even if server is unreachable
  }
  await deleteItem('accessToken');
  await deleteItem('refreshToken');
  await deleteItem('userEmail');
}
