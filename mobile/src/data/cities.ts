export interface City {
  name: string;
  code: string; // IATA code
  country: string;
}

export const CITIES: City[] = [
  { name: 'London', code: 'LON', country: 'UK' },
  { name: 'Paris', code: 'PAR', country: 'FR' },
  { name: 'Berlin', code: 'BER', country: 'DE' },
  { name: 'Amsterdam', code: 'AMS', country: 'NL' },
  { name: 'Rome', code: 'ROM', country: 'IT' },
  { name: 'Madrid', code: 'MAD', country: 'ES' },
  { name: 'Barcelona', code: 'BCN', country: 'ES' },
  { name: 'Vienna', code: 'VIE', country: 'AT' },
  { name: 'Prague', code: 'PRG', country: 'CZ' },
  { name: 'Budapest', code: 'BUD', country: 'HU' },
  { name: 'Lisbon', code: 'LIS', country: 'PT' },
  { name: 'Dublin', code: 'DUB', country: 'IE' },
  { name: 'Brussels', code: 'BRU', country: 'BE' },
  { name: 'Munich', code: 'MUC', country: 'DE' },
  { name: 'Milan', code: 'MIL', country: 'IT' },
  { name: 'Zurich', code: 'ZRH', country: 'CH' },
  { name: 'Stockholm', code: 'STO', country: 'SE' },
  { name: 'Copenhagen', code: 'CPH', country: 'DK' },
  { name: 'Warsaw', code: 'WAW', country: 'PL' },
  { name: 'Krakow', code: 'KRK', country: 'PL' },
  { name: 'Athens', code: 'ATH', country: 'GR' },
  { name: 'Istanbul', code: 'IST', country: 'TR' },
  { name: 'Edinburgh', code: 'EDI', country: 'UK' },
  { name: 'Nice', code: 'NCE', country: 'FR' },
  { name: 'Porto', code: 'OPO', country: 'PT' },
  { name: 'Lyon', code: 'LYS', country: 'FR' },
  { name: 'Hamburg', code: 'HAM', country: 'DE' },
  { name: 'Florence', code: 'FLR', country: 'IT' },
  { name: 'Oslo', code: 'OSL', country: 'NO' },
  { name: 'Helsinki', code: 'HEL', country: 'FI' },
  { name: 'Bucharest', code: 'BUH', country: 'RO' },
  { name: 'Sofia', code: 'SOF', country: 'BG' },
  { name: 'Belgrade', code: 'BEG', country: 'RS' },
  { name: 'Zagreb', code: 'ZAG', country: 'HR' },
  { name: 'Bratislava', code: 'BTS', country: 'SK' },
  { name: 'Ljubljana', code: 'LJU', country: 'SI' },
];
