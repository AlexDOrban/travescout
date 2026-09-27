import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import LoginScreen from '../../app/(auth)/login';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useFocusEffect: jest.fn(),
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#0f172a', card: '#1e293b', text: '#f1f5f9',
      textSecondary: '#94a3b8', accent: '#6366f1', border: '#334155', error: '#ef4444',
    },
  }),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockLogin = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ login: mockLogin, user: null, loading: false });
});

describe('LoginScreen', () => {
  it('renders email and password inputs', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  it('shows error when submitting empty form', async () => {
    const { getByText, getByTestId } = render(<LoginScreen />);
    fireEvent.press(getByTestId('submit-btn'));
    await waitFor(() => {
      expect(getByText('Email and password are required')).toBeTruthy();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with email and password', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'pass123');
    fireEvent.press(getByTestId('submit-btn'));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'pass123');
    });
  });

  it('shows error message when login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    const { getByPlaceholderText, getByTestId, findByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');
    fireEvent.press(getByTestId('submit-btn'));
    expect(await findByText('Invalid credentials')).toBeTruthy();
  });
});
