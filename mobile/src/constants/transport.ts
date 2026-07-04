export const TRANSPORT_ICON: Record<string, string> = {
  flight: '✈️',
  bus: '🚌',
  train: '🚆',
};

// Booked trips only persist the provider, so transport type is derived.
export const PROVIDER_TRANSPORT: Record<string, string> = {
  amadeus: 'flight',
  flixbus: 'bus',
  rail: 'train',
};
