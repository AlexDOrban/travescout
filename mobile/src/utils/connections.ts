import type { Leg, Connection } from '../types/itinerary';
import { cityHasHub, getHubByCode } from '../data/hubs';

export function computeConnections(legs: Leg[]): Connection[] {
  const connections: Connection[] = [];
  for (let i = 0; i < legs.length - 1; i++) {
    const arrive = new Date(legs[i].arriveAt).getTime();
    const depart = new Date(legs[i + 1].departAt).getTime();
    const transferMins = Math.round((depart - arrive) / (1000 * 60));

    // Outbound → return is the stay at the destination, not a connection.
    if ((legs[i].direction ?? 'outbound') !== (legs[i + 1].direction ?? 'outbound')) {
      connections.push({ transferMins, stay: true });
      continue;
    }

    // Per-hub minimum transfer time when we know the hub; fall back to
    // a generic threshold by transport type.
    const hub = getHubByCode(legs[i].destination);
    const prevType = legs[i].transportType;
    const threshold = hub?.transferMins ?? (prevType === 'flight' ? 90 : 45);

    const warning = transferMins < threshold
      ? `Tight connection (${transferMins} min)`
      : undefined;

    connections.push({ transferMins, warning });
  }
  return connections;
}

// Bus/train results use city codes as origin/destination, so a leg that
// starts in the searched city needs no feeder connection even though the
// city code is not a hub code.
export function needsDepartureConnection(originCityCode: string, departureHubCode: string): boolean {
  if (originCityCode === departureHubCode) return false;
  return !cityHasHub(originCityCode, departureHubCode);
}

export function needsArrivalConnection(destCityCode: string, arrivalHubCode: string): boolean {
  if (destCityCode === arrivalHubCode) return false;
  return !cityHasHub(destCityCode, arrivalHubCode);
}
