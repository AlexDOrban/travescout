import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CityAutocomplete } from '../../src/components/CityAutocomplete';

jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#fff', textSecondary: '#aaa', card: '#111',
      border: '#333', background: '#000', accent: '#66f',
      cheapest: '#0f0', error: '#f00',
    },
  }),
}));

describe('CityAutocomplete', () => {
  it('renders label and input', () => {
    const { getByText, getByTestId } = render(
      <CityAutocomplete label="From" value="" onSelect={jest.fn()} testID="from" />,
    );
    expect(getByText('From')).toBeTruthy();
    expect(getByTestId('from')).toBeTruthy();
  });

  it('shows filtered suggestions when user types', () => {
    const { getByTestId } = render(
      <CityAutocomplete label="From" value="" onSelect={jest.fn()} testID="from" />,
    );
    fireEvent.changeText(getByTestId('from'), 'Lon');
    expect(getByTestId('from-dropdown')).toBeTruthy();
    expect(getByTestId('from-option-LON')).toBeTruthy();
  });

  it('calls onSelect and closes dropdown when option tapped', () => {
    const onSelect = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <CityAutocomplete label="From" value="" onSelect={onSelect} testID="from" />,
    );
    fireEvent.changeText(getByTestId('from'), 'Lon');
    fireEvent.press(getByTestId('from-option-LON'));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'London', code: 'LON' }),
    );
    expect(queryByTestId('from-dropdown')).toBeNull();
  });

  it('shows no dropdown when query is empty', () => {
    const { queryByTestId, getByTestId } = render(
      <CityAutocomplete label="From" value="" onSelect={jest.fn()} testID="from" />,
    );
    fireEvent.changeText(getByTestId('from'), '');
    expect(queryByTestId('from-dropdown')).toBeNull();
  });

  it('matches by IATA code', () => {
    const { getByTestId } = render(
      <CityAutocomplete label="From" value="" onSelect={jest.fn()} testID="from" />,
    );
    fireEvent.changeText(getByTestId('from'), 'LON');
    expect(getByTestId('from-option-LON')).toBeTruthy();
  });

  const arrow = (input: any, key: string) =>
    fireEvent(input, 'keyPress', { nativeEvent: { key } });

  it('moves the highlight with arrow keys and selects with enter', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <CityAutocomplete label="From" value="" onSelect={onSelect} testID="from" />,
    );
    const input = getByTestId('from');
    fireEvent.changeText(input, 'B'); // Berlin, Barcelona, Budapest, Brussels
    arrow(input, 'ArrowDown');
    arrow(input, 'ArrowDown');
    fireEvent(input, 'submitEditing');
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BCN', name: 'Barcelona' }),
    );
  });

  it('arrow up moves the highlight back and clamps at the top', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <CityAutocomplete label="From" value="" onSelect={onSelect} testID="from" />,
    );
    const input = getByTestId('from');
    fireEvent.changeText(input, 'B');
    arrow(input, 'ArrowDown');
    arrow(input, 'ArrowDown');
    arrow(input, 'ArrowUp');
    arrow(input, 'ArrowUp');
    arrow(input, 'ArrowUp'); // clamps at first option
    fireEvent(input, 'submitEditing');
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BER', name: 'Berlin' }),
    );
  });

  it('enter with no highlight selects the first suggestion', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <CityAutocomplete label="From" value="" onSelect={onSelect} testID="from" />,
    );
    const input = getByTestId('from');
    fireEvent.changeText(input, 'Par');
    fireEvent(input, 'submitEditing');
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PAR', name: 'Paris' }),
    );
  });
});
