import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteMapMenu } from '../../src/components/RouteMapMenu';
import { getTransferPrefs, saveTransferPrefs } from '../../src/utils/transferPrefs';
import { DARK } from '../../src/constants/colors';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
const mockOpen = Linking.openURL as jest.Mock;

const FLIGHT_LEGS = [{ origin: 'LHR', destination: 'CDG', transportType: 'flight' }];

beforeEach(async () => {
  mockOpen.mockClear();
  await AsyncStorage.clear();
});

function openMenu(ui: ReturnType<typeof render>) {
  fireEvent.press(ui.getByTestId('route-map-toggle'));
}

describe('RouteMapMenu', () => {
  it('shows airport-access segments for a flight, starting at the current location', () => {
    const ui = render(<RouteMapMenu legs={FLIGHT_LEGS} colors={DARK} />);
    openMenu(ui);
    expect(ui.getByText(/Your location → London Heathrow, UK/)).toBeTruthy();
    expect(ui.getByText(/Paris Charles de Gaulle, FR → Paris, FR/)).toBeTruthy();
  });

  it('uses typed leaving-from and final-destination addresses in the segments', () => {
    const ui = render(<RouteMapMenu legs={FLIGHT_LEGS} colors={DARK} />);
    openMenu(ui);
    fireEvent.changeText(ui.getByTestId('route-start-address'), 'Savoy Hotel, London');
    fireEvent.changeText(ui.getByTestId('route-end-address'), 'Hôtel Lutetia, Paris');
    expect(ui.getByText(/Savoy Hotel, London → London Heathrow, UK/)).toBeTruthy();
    expect(ui.getByText(/Paris Charles de Gaulle, FR → Hôtel Lutetia, Paris/)).toBeTruthy();
  });

  it('opens links with the selected travel mode', () => {
    const ui = render(<RouteMapMenu legs={FLIGHT_LEGS} colors={DARK} />);
    openMenu(ui);
    fireEvent.press(ui.getByTestId('route-mode-walking'));
    fireEvent.press(ui.getByTestId('route-segment-0-google'));
    expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining('travelmode=walking'));
  });

  it('defaults links to transit mode', () => {
    const ui = render(<RouteMapMenu legs={FLIGHT_LEGS} colors={DARK} />);
    openMenu(ui);
    fireEvent.press(ui.getByTestId('route-segment-0-apple'));
    expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining('dirflg=r'));
  });

  it('prefills saved transfer prefs for its storage key', async () => {
    await saveTransferPrefs('BK-1', {
      startAddress: 'Savoy Hotel, London',
      endAddress: 'Hôtel Lutetia, Paris',
      travelMode: 'walking',
    });
    const ui = render(<RouteMapMenu legs={FLIGHT_LEGS} colors={DARK} storageKey="BK-1" />);
    openMenu(ui);
    await waitFor(() =>
      expect(ui.getByText(/Savoy Hotel, London → London Heathrow, UK/)).toBeTruthy(),
    );
    fireEvent.press(ui.getByTestId('route-segment-0-google'));
    expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining('travelmode=walking'));
  });

  it('seeds inputs from initialPrefs and reports edits via onChange', () => {
    const onChange = jest.fn();
    const ui = render(
      <RouteMapMenu
        legs={FLIGHT_LEGS}
        colors={DARK}
        initialPrefs={{ startAddress: 'Savoy Hotel, London', endAddress: '', travelMode: 'transit' }}
        onChange={onChange}
      />,
    );
    openMenu(ui);
    expect(ui.getByText(/Savoy Hotel, London → London Heathrow, UK/)).toBeTruthy();

    fireEvent.changeText(ui.getByTestId('route-end-address'), 'Hôtel Lutetia, Paris');
    expect(onChange).toHaveBeenCalledWith({
      startAddress: 'Savoy Hotel, London',
      endAddress: 'Hôtel Lutetia, Paris',
      travelMode: 'transit',
    });
  });

  it('persists edits so they survive a remount', async () => {
    const ui = render(<RouteMapMenu legs={FLIGHT_LEGS} colors={DARK} storageKey="BK-2" />);
    openMenu(ui);
    fireEvent.changeText(ui.getByTestId('route-start-address'), 'The Ritz, London');
    fireEvent.press(ui.getByTestId('route-mode-driving'));
    await waitFor(async () =>
      expect(await getTransferPrefs('BK-2')).toEqual({
        startAddress: 'The Ritz, London',
        endAddress: '',
        travelMode: 'driving',
      }),
    );
  });
});
