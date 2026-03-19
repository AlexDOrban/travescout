import type { Leg, Connection } from '../types/itinerary';
import { cityHasHub } from '../data/hubs';

export function computeConnections(legs: Leg[]): Connection[] {
  const connections: Connection[] = [];
  for (let i = 0; i < legs.length - 1; i++) {
    const arrive = new Date(legs[i].arriveAt).getTime();
    const depart = new Date(legs[i + 1].departAt).getTime();
    const transferMins = Math.round((depart - arrive) / (1000 * 60));

    const prevType = legs[i].transportType;
    const threshold = prevType === 'flight' ? 90 : 45;

    const warning = transferMins < threshold
      ? `Tight connection (${transferMins} min)`
      : undefined;

    connections.push({ transferMins, warning });
  }
  return connections;
}

export function needsDepartureConnection(originCityCode: string, departureHubCode: string): boolean {
  return !cityHasHub(originCityCode, departureHubCode);
}

export function needsArrivalConnection(destCityCode: string, arrivalHubCode: string): boolean {
  return !cityHasHub(destCityCode, arrivalHubCode);
}
