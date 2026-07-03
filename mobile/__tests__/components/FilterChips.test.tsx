import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FilterChips } from '../../src/components/FilterChips';

jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#fff', textSecondary: '#aaa', card: '#111',
      border: '#333', background: '#000', accent: '#66f',
      cheapest: '#0f0', error: '#f00',
    },
  }),
}));

describe('FilterChips', () => {
  it('renders all transport and sort chips', () => {
    const { getByTestId } = render(
      <FilterChips
        transport="all"
        onTransportChange={jest.fn()}
        sort="smart"
        onSortChange={jest.fn()}
      />,
    );
    expect(getByTestId('filter-all')).toBeTruthy();
    expect(getByTestId('filter-flight')).toBeTruthy();
    expect(getByTestId('filter-train')).toBeTruthy();
    expect(getByTestId('filter-bus')).toBeTruthy();
    expect(getByTestId('sort-smart')).toBeTruthy();
    expect(getByTestId('sort-price')).toBeTruthy();
    expect(getByTestId('sort-duration')).toBeTruthy();
    expect(getByTestId('sort-departure')).toBeTruthy();
  });

  it('calls onTransportChange when transport chip pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <FilterChips
        transport="all"
        onTransportChange={onChange}
        sort="smart"
        onSortChange={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('filter-flight'));
    expect(onChange).toHaveBeenCalledWith('flight');
  });

  it('calls onSortChange when sort chip pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <FilterChips
        transport="all"
        onTransportChange={jest.fn()}
        sort="smart"
        onSortChange={onChange}
      />,
    );
    fireEvent.press(getByTestId('sort-price'));
    expect(onChange).toHaveBeenCalledWith('price');
  });
});
