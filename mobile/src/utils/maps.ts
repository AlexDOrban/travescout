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
