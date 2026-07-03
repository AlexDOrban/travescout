import { api } from '../../src/api/client';
import { setItem, deleteItem } from '../../src/api/storage';
import { login, register, logout } from '../../src/api/auth';

jest.mock('../../src/api/client', () => ({
  api: {
    post: jest.fn(),
  },
}));

jest.mock('../../src/api/storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  deleteItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
}));

const mockPost = api.post as jest.Mock;
const mockSetItem = setItem as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('login', () => {
  it('posts to /auth/login and stores tokens', async () => {
    mockPost.mockResolvedValueOnce({ accessToken: 'at1', refreshToken: 'rt1' });
    await login('a@b.com', 'pass123');
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pass123' });
    expect(mockSetItem).toHaveBeenCalledWith('accessToken', 'at1');
    expect(mockSetItem).toHaveBeenCalledWith('refreshToken', 'rt1');
    expect(mockSetItem).toHaveBeenCalledWith('userEmail', 'a@b.com');
  });

  it('returns the response data', async () => {
    const data = { accessToken: 'at1', refreshToken: 'rt1' };
    mockPost.mockResolvedValueOnce(data);
    const result = await login('a@b.com', 'pass');
    expect(result).toEqual(data);
  });
});

describe('register', () => {
  it('posts to /auth/register and stores tokens', async () => {
    mockPost.mockResolvedValueOnce({ accessToken: 'at2', refreshToken: 'rt2' });
    await register('new@user.com', 'newpass');
    expect(mockPost).toHaveBeenCalledWith('/auth/register', { email: 'new@user.com', password: 'newpass' });
    expect(mockSetItem).toHaveBeenCalledWith('accessToken', 'at2');
    expect(mockSetItem).toHaveBeenCalledWith('userEmail', 'new@user.com');
  });
});

describe('logout', () => {
  it('posts to /auth/logout and clears stored tokens', async () => {
    mockPost.mockResolvedValueOnce({});
    await logout('rt-old');
    expect(mockPost).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'rt-old' });
    expect(deleteItem).toHaveBeenCalledWith('accessToken');
    expect(deleteItem).toHaveBeenCalledWith('refreshToken');
    expect(deleteItem).toHaveBeenCalledWith('userEmail');
  });

  it('still clears tokens even if logout request fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));
    await logout('rt-old'); // should not throw
    expect(deleteItem).toHaveBeenCalledWith('accessToken');
    expect(deleteItem).toHaveBeenCalledWith('refreshToken');
    expect(deleteItem).toHaveBeenCalledWith('userEmail');
  });
});
