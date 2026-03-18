/**
 * @typedef {Object} Trip
 * @property {string} id - Unique ID: "<provider>:<raw-id>"
 * @property {'amadeus'|'flixbus'|'rail'} provider
 * @property {'flight'|'bus'|'train'} transportType
 * @property {string} origin - IATA code or city name
 * @property {string} destination - IATA code or city name
 * @property {string} departAt - ISO 8601 datetime
 * @property {string} arriveAt - ISO 8601 datetime
 * @property {number} durationMins - Total journey time in minutes
 * @property {number} priceEur - Total price for all adults in EUR
 * @property {number} stops - Number of stops (0 = direct)
 * @property {string} deepLink - URL to provider booking page
 */

/**
 * @typedef {Trip & { tags: string[], score: number }} RankedTrip
 */

module.exports = {}; // No runtime exports — types only
