import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import RegisterScreen from '../../app/(auth)/register';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useFocusEffect: jest.fn(),
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
const mockRegister = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ register: mockRegister });
});

describe('RegisterScreen', () => {
  it('shows error for short password', async () => {
    const { getByPlaceholderText, getByTestId, findByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText(/Password/), 'short');
    fireEvent.press(getByTestId('submit-btn'));
    expect(await findByText('Password must be at least 8 characters')).toBeTruthy();
  });

  it('calls register with correct args', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    const { getByPlaceholderText, getByTestId } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'new@b.com');
    fireEvent.changeText(getByPlaceholderText(/Password/), 'longpassword');
    fireEvent.press(getByTestId('submit-btn'));
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('new@b.com', 'longpassword');
    });
  });
});
