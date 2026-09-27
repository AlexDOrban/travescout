import { getHubByCode } from '../data/hubs';
import { CITIES } from '../data/cities';

// Turn an origin/destination code (airport hub like "LHR", or city code like
// "LON") into a human, geocodable place label for a maps deep link.
export function resolveStopLabel(code: string): string {
  const hub = getHubByCode(code);
  if (hub) {
    const city = CITIES.find(c => c.code === hub.cityCode);
    return city ? `${hub.name}, ${city.country}` : hub.name;
  }
  const city = CITIES.find(c => c.code === code);
  if (city) return `${city.name}, ${city.country}`;
  return code;
}

// Ordered, human stop labels for a route, dropping consecutive duplicates
// (e.g. a leg that arrives and departs the same city).
export function routeStops(codes: string[]): string[] {
  const labels: string[] = [];
  for (const code of codes) {
    if (!code) continue;
    const label = resolveStopLabel(code);
    if (labels[labels.length - 1] !== label) labels.push(label);
  }
  return labels;
}

const enc = (s: string) => encodeURIComponent(s);

// Every bookable trip is public transport (flight/bus/train), so map links
// default to transit directions; the user can switch mode in the map app.
export type MapTravelMode = 'transit' | 'driving' | 'walking' | 'bicycling';

const APPLE_DIRFLG: Record<MapTravelMode, string> = {
  transit: 'r',
  driving: 'd',
  walking: 'w',
  bicycling: 'c',
};

// Google Maps supports intermediate waypoints, so the whole multi-leg route
// is shown. Universal https link opens the app if installed, else the web.
export function googleMapsUrl(stops: string[], mode: MapTravelMode = 'transit'): string {
  if (stops.length < 2) return '';
  const origin = enc(stops[0]);
  const destination = enc(stops[stops.length - 1]);
  const waypoints = stops.slice(1, -1).map(enc).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  url += `&travelmode=${mode}`;
  return url;
}

// Apple Maps URLs support a single origin/destination only, so it shows the
// overall start → end of the trip.
export function appleMapsUrl(stops: string[], mode: MapTravelMode = 'transit'): string {
  if (stops.length < 2) return '';
  return `https://maps.apple.com/?saddr=${enc(stops[0])}&daddr=${enc(stops[stops.length - 1])}&dirflg=${APPLE_DIRFLG[mode]}`;
}

// --- ground-only route segments -------------------------------------------
//
// Map apps can't draw a flight, so a trip's map route is split into its
// ground portions: booked bus/train legs, plus how to reach the departure
// airport and leave the arrival airport around each flight leg.

export interface RouteLegInput {
  origin: string;
  destination: string;
  /** 'flight' | 'bus' | 'train' — anything but 'flight' is a ground leg. */
  transportType?: string;
}

export interface MapSegment {
  kind: 'ground' | 'to-airport' | 'from-airport';
  /** Resolved stop labels, origin..destination. */
  stops: string[];
  /** Single-stop segment starting at the user's current location. */
  fromCurrentLocation?: boolean;
}

// The city a hub belongs to, as a geocodable label — or null if unknown.
function hubCityLabel(code: string): string | null {
  const hub = getHubByCode(code);
  if (!hub) return null;
  const city = CITIES.find(c => c.code === hub.cityCode);
  return city ? `${city.name}, ${city.country}` : null;
}

export interface RouteEndpoints {
  /** Free-text place the user leaves from (hotel, home address…). */
  startAddress?: string;
  /** Free-text final destination (hotel, venue…). */
  endAddress?: string;
}

export function groundSegments(legs: RouteLegInput[], endpoints: RouteEndpoints = {}): MapSegment[] {
  const start = endpoints.startAddress?.trim() || null;
  const end = endpoints.endAddress?.trim() || null;
  const segments: MapSegment[] = [];
  let chain: string[] = [];

  const flush = () => {
    if (chain.length >= 2) segments.push({ kind: 'ground', stops: chain });
    chain = [];
  };

  legs.forEach((leg, i) => {
    if (leg.transportType !== 'flight') {
      const from = resolveStopLabel(leg.origin);
      const to = resolveStopLabel(leg.destination);
      // Leaving from a typed address before the first ground leg.
      if (i === 0 && start && start !== from) {
        segments.push({ kind: 'ground', stops: [start, from] });
      }
      if (chain.length === 0) chain.push(from);
      else if (chain[chain.length - 1] !== from) {
        flush();
        chain.push(from);
      }
      if (chain[chain.length - 1] !== to) chain.push(to);
      // Continuing to a typed address after the last ground leg.
      if (i === legs.length - 1 && end && end !== to) {
        flush();
        segments.push({ kind: 'ground', stops: [to, end] });
      }
      return;
    }

    flush();

    // Getting TO the departure airport: from the typed start address or the
    // previous leg's arrival point — or the user's current location.
    const departAirport = resolveStopLabel(leg.origin);
    const prev = i > 0 ? resolveStopLabel(legs[i - 1].destination) : start;
    if (prev === null) {
      segments.push({ kind: 'to-airport', stops: [departAirport], fromCurrentLocation: true });
    } else if (prev !== departAirport) {
      segments.push({ kind: 'to-airport', stops: [prev, departAirport] });
    }

    // Getting FROM the arrival airport: to the next leg's departure point,
    // or the typed final destination, or the arrival city.
    const arriveAirport = resolveStopLabel(leg.destination);
    const next = legs[i + 1];
    const toLabel = next
      ? resolveStopLabel(next.origin)
      : end ?? hubCityLabel(leg.destination);
    if (toLabel && toLabel !== arriveAirport) {
      segments.push({ kind: 'from-airport', stops: [arriveAirport, toLabel] });
    }
  });

  flush();
  return segments;
}

export function segmentGoogleUrl(seg: MapSegment, mode: MapTravelMode = 'transit'): string {
  if (seg.fromCurrentLocation && seg.stops.length === 1) {
    // No origin param — Google Maps falls back to the current location.
    return `https://www.google.com/maps/dir/?api=1&destination=${enc(seg.stops[0])}&travelmode=${mode}`;
  }
  return googleMapsUrl(seg.stops, mode);
}

export function segmentAppleUrl(seg: MapSegment, mode: MapTravelMode = 'transit'): string {
  if (seg.fromCurrentLocation && seg.stops.length === 1) {
    // No saddr param — Apple Maps starts from the current location.
    return `https://maps.apple.com/?daddr=${enc(seg.stops[0])}&dirflg=${APPLE_DIRFLG[mode]}`;
  }
  return appleMapsUrl(seg.stops, mode);
}
