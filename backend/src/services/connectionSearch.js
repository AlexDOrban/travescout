const flixbus = require('../providers/flixbus');
const rail = require('../providers/rail');
const flixbusNorm = require('../normalizers/flixbus');
const railNorm = require('../normalizers/rail');
const { getHubsForCity, getHubByCode } = require('../data/hubs');

const PROVIDERS = [
  { name: 'flixbus', provider: flixbus, normalizer: flixbusNorm, type: 'bus' },
  { name: 'rail', provider: rail, normalizer: railNorm, type: 'train' },
];

async function searchConnections({ hub, cityCode, direction, dateTime, adults }) {
  const hubInfo = getHubByCode(hub);
  const cityHubs = getHubsForCity(cityCode);
  const refTime = new Date(dateTime);

  // Determine search params based on direction
  let from, to;
  if (direction === 'to') {
    from = cityCode;
    to = hubInfo ? hubInfo.cityCode : hub;
  } else {
    from = hubInfo ? hubInfo.cityCode : hub;
    to = cityCode;
  }

  // Search bus and train providers in parallel
  const providersQueried = [];
  const providersFailed = [];
  const allResults = [];

  const results = await Promise.allSettled(
    PROVIDERS.map(({ name, provider, normalizer }) => {
      providersQueried.push(name);
      return provider.search({
        from,
        to,
        departDate: refTime.toISOString().split('T')[0],
        adults,
      }).then(raw => normalizer.normalize(raw));
    })
  );

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
    } else {
      providersFailed.push(PROVIDERS[i].name);
    }
  });

  // Filter by time window
  const filtered = allResults.filter(trip => {
    const depart = new Date(trip.departAt);
    const arrive = new Date(trip.arriveAt);

    if (direction === 'to') {
      // Must arrive at hub 1h-6h before main leg departs
      const diffMs = refTime - arrive;
      const diffHrs = diffMs / (1000 * 60 * 60);
      return diffHrs >= 1 && diffHrs <= 6;
    } else {
      // Must depart from hub 30min-4h after main leg arrives
      const diffMs = depart - refTime;
      const diffMins = diffMs / (1000 * 60);
      return diffMins >= 30 && diffMins <= 240;
    }
  });

  // Sort by departure time
  filtered.sort((a, b) => new Date(a.departAt) - new Date(b.departAt));

  // Add origin/destination names from hub data
  const connections = filtered.map(trip => {
    const stationType = trip.transportType === 'bus' ? 'bus_station' : 'train_station';
    const cityStation = cityHubs.find(h => h.type === stationType);
    const cityStationName = cityStation?.name || trip.origin;

    return {
      ...trip,
      originName: direction === 'to' ? cityStationName : (hubInfo?.name || trip.origin),
      destinationName: direction === 'to' ? (hubInfo?.name || trip.destination) : cityStationName,
    };
  });

  return {
    connections,
    meta: {
      hub,
      cityCode,
      direction,
      referenceTime: dateTime,
      providersQueried,
      providersFailed,
    },
  };
}

module.exports = { searchConnections };
