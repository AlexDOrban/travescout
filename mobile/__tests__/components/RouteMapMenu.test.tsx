import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { RouteMapMenu } from '../../src/components/RouteMapMenu';
import { DARK } from '../../src/constants/colors';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
const mockOpen = Linking.openURL as jest.Mock;

const FLIGHT_LEGS = [{ origin: 'LHR', destination: 'CDG', transportType: 'flight' }];

beforeEach(() => mockOpen.mockClear());

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
});
