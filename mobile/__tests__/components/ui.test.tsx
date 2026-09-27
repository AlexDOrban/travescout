import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/contexts/ThemeContext';
import { Button } from '../../src/components/ui/Button';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { EmptyState } from '../../src/components/ui/EmptyState';

jest.mock('../../src/api/storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Button', () => {
  it('fires onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = wrap(<Button title="Go" icon="search" onPress={onPress} testID="b" />);
    fireEvent.press(getByTestId('b'));
    expect(onPress).toHaveBeenCalled();
  });

  it('ignores presses while loading', () => {
    const onPress = jest.fn();
    const { getByTestId, queryByText } = wrap(<Button title="Go" loading onPress={onPress} testID="b" />);
    fireEvent.press(getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
    expect(queryByText('Go')).toBeNull();
  });
});

describe('SegmentedControl', () => {
  it('reports the tapped segment and marks the active one selected', () => {
    const onChange = jest.fn();
    const { getByTestId } = wrap(
      <SegmentedControl
        segments={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B', detail: '€10' }]}
        value="a"
        onChange={onChange}
        testIDPrefix="seg"
      />,
    );
    expect(getByTestId('seg-a').props.accessibilityState.selected).toBe(true);
    fireEvent.press(getByTestId('seg-b'));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('EmptyState', () => {
  it('renders the action when provided', () => {
    const onAction = jest.fn();
    const { getByText, getByTestId } = wrap(
      <EmptyState icon="airplane" title="Nothing" subtitle="sub" actionLabel="Do it" onAction={onAction} actionTestID="act" />,
    );
    expect(getByText('Nothing')).toBeTruthy();
    fireEvent.press(getByTestId('act'));
    expect(onAction).toHaveBeenCalled();
  });
});
