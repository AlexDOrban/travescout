const amadeusProvider = require('./amadeus');
const flixbusProvider = require('./flixbus');
const railProvider = require('./rail');
const amadeusNorm = require('../normalizers/amadeus');
const flixbusNorm = require('../normalizers/flixbus');
const railNorm = require('../normalizers/rail');

const PROVIDERS = [
  { name: 'amadeus', provider: amadeusProvider, normalizer: amadeusNorm },
  { name: 'flixbus', provider: flixbusProvider, normalizer: flixbusNorm },
  { name: 'rail', provider: railProvider, normalizer: railNorm },
];

/**
 * Calls all providers in parallel. A single provider failure does not block others.
 * @param {Object} params - Validated search params
 * @returns {Promise<{ trips: import('../types/trip').Trip[], providersFailed: string[] }>}
 */
async function fanOut(params) {
  const results = await Promise.allSettled(
    PROVIDERS.map(({ provider }) => provider.search(params))
  );

  const trips = [];
  const providersFailed = [];

  results.forEach((result, i) => {
    const { name, normalizer } = PROVIDERS[i];
    if (result.status === 'fulfilled') {
      trips.push(...normalizer.normalize(result.value));
    } else {
      console.error(`[search] Provider ${name} failed:`, result.reason);
      providersFailed.push(name);
    }
  });

  return { trips, providersFailed };
}

function getProvider(name) {
  const entry = PROVIDERS.find(p => p.name === name);
  if (!entry) throw Object.assign(new Error(`Unknown provider: ${name}`), { status: 400 });
  return entry.provider;
}

module.exports = { fanOut, PROVIDERS, getProvider };
