import { getItem, setItem, deleteItem } from '../../src/api/storage';
import { api } from '../../src/api/client';

jest.mock('../../src/api/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  deleteItem: jest.fn(),
}));

const mockGetItem = getItem as jest.Mock;
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null); // no token by default
});

describe('api.get', () => {
  it('makes GET request to BASE_URL + path', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: 1 }) });
    const result = await api.get('/health');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(result).toEqual({ data: 1 });
  });

  it('attaches Authorization header when token exists', async () => {
    mockGetItem.mockResolvedValue('my-token');
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    await api.get('/search');
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer my-token');
  });

  it('throws with status on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad input' }),
    });
    await expect(api.get('/search')).rejects.toMatchObject({ status: 400, message: 'Bad input' });
  });
});

describe('api.post', () => {
  it('makes POST with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ id: 1 }) });
    await api.post('/auth/login', { email: 'a@b.com', password: 'pass' });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ email: 'a@b.com', password: 'pass' }));
  });
});

describe('401 token refresh', () => {
  it('retries with new token after successful refresh', async () => {
    const mockSetItem = setItem as jest.Mock;
    // First call: access token present, 401 returned
    mockGetItem
      .mockResolvedValueOnce('old-access-token') // accessToken for initial request
      .mockResolvedValueOnce('refresh-token')    // refreshToken in tryRefresh
      .mockResolvedValueOnce('new-access-token'); // accessToken for retry
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }) // first attempt
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: 'new-access-token' }) }) // refresh call
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: 'ok' }) }); // retry
    const result = await api.get('/search');
    expect(mockSetItem).toHaveBeenCalledWith('accessToken', 'new-access-token');
    expect(result).toEqual({ data: 'ok' });
  });

  it('clears tokens and throws 401 when refresh fails', async () => {
    const mockDeleteItem = deleteItem as jest.Mock;
    mockGetItem
      .mockResolvedValueOnce('old-access-token') // initial request
      .mockResolvedValueOnce('refresh-token');   // tryRefresh
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }) // first attempt
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }); // refresh fails
    await expect(api.get('/search')).rejects.toMatchObject({ status: 401 });
    expect(mockDeleteItem).toHaveBeenCalledWith('accessToken');
    expect(mockDeleteItem).toHaveBeenCalledWith('refreshToken');
  });
});
