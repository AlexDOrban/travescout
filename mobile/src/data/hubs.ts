export interface TransportHub {
  type: 'airport' | 'train_station' | 'bus_station';
  code: string;
  name: string;
  cityCode: string;
  transferMins: number;
}

const HUBS: Array<{ cityCode: string; hubs: TransportHub[] }> = [
  { cityCode: 'LON', hubs: [
    { type: 'airport', code: 'LHR', name: 'London Heathrow', cityCode: 'LON', transferMins: 45 },
    { type: 'airport', code: 'STN', name: 'London Stansted', cityCode: 'LON', transferMins: 60 },
    { type: 'train_station', code: 'LON-STP', name: 'London St Pancras', cityCode: 'LON', transferMins: 20 },
    { type: 'bus_station', code: 'LON-VIC', name: 'London Victoria Coach', cityCode: 'LON', transferMins: 15 },
  ]},
  { cityCode: 'PAR', hubs: [
    { type: 'airport', code: 'CDG', name: 'Paris Charles de Gaulle', cityCode: 'PAR', transferMins: 50 },
    { type: 'airport', code: 'ORY', name: 'Paris Orly', cityCode: 'PAR', transferMins: 35 },
    { type: 'train_station', code: 'PAR-GDN', name: 'Paris Gare du Nord', cityCode: 'PAR', transferMins: 15 },
    { type: 'bus_station', code: 'PAR-BER', name: 'Paris Bercy Seine', cityCode: 'PAR', transferMins: 20 },
  ]},
  { cityCode: 'BER', hubs: [
    { type: 'airport', code: 'BER-APT', name: 'Berlin Brandenburg', cityCode: 'BER', transferMins: 40 },
    { type: 'train_station', code: 'BER-HBF', name: 'Berlin Hauptbahnhof', cityCode: 'BER', transferMins: 10 },
    { type: 'bus_station', code: 'BER-ZOB', name: 'Berlin ZOB', cityCode: 'BER', transferMins: 15 },
  ]},
  { cityCode: 'AMS', hubs: [
    { type: 'airport', code: 'AMS-APT', name: 'Amsterdam Schiphol', cityCode: 'AMS', transferMins: 20 },
    { type: 'train_station', code: 'AMS-CEN', name: 'Amsterdam Centraal', cityCode: 'AMS', transferMins: 10 },
    { type: 'bus_station', code: 'AMS-SLO', name: 'Amsterdam Sloterdijk', cityCode: 'AMS', transferMins: 15 },
  ]},
  { cityCode: 'ROM', hubs: [
    { type: 'airport', code: 'FCO', name: 'Rome Fiumicino', cityCode: 'ROM', transferMins: 45 },
    { type: 'train_station', code: 'ROM-TER', name: 'Roma Termini', cityCode: 'ROM', transferMins: 15 },
    { type: 'bus_station', code: 'ROM-TIB', name: 'Roma Tiburtina Bus', cityCode: 'ROM', transferMins: 20 },
  ]},
  { cityCode: 'MAD', hubs: [
    { type: 'airport', code: 'MAD-APT', name: 'Madrid Barajas', cityCode: 'MAD', transferMins: 35 },
    { type: 'train_station', code: 'MAD-ATO', name: 'Madrid Atocha', cityCode: 'MAD', transferMins: 15 },
    { type: 'bus_station', code: 'MAD-SUR', name: 'Madrid Estación Sur', cityCode: 'MAD', transferMins: 20 },
  ]},
  { cityCode: 'BCN', hubs: [
    { type: 'airport', code: 'BCN-APT', name: 'Barcelona El Prat', cityCode: 'BCN', transferMins: 30 },
    { type: 'train_station', code: 'BCN-SAN', name: 'Barcelona Sants', cityCode: 'BCN', transferMins: 12 },
    { type: 'bus_station', code: 'BCN-NOR', name: 'Barcelona Nord', cityCode: 'BCN', transferMins: 15 },
  ]},
  { cityCode: 'VIE', hubs: [
    { type: 'airport', code: 'VIE-APT', name: 'Vienna Schwechat', cityCode: 'VIE', transferMins: 25 },
    { type: 'train_station', code: 'VIE-HBF', name: 'Wien Hauptbahnhof', cityCode: 'VIE', transferMins: 10 },
    { type: 'bus_station', code: 'VIE-ERD', name: 'Vienna Erdberg', cityCode: 'VIE', transferMins: 15 },
  ]},
  { cityCode: 'PRG', hubs: [
    { type: 'airport', code: 'PRG-APT', name: 'Prague Václav Havel', cityCode: 'PRG', transferMins: 30 },
    { type: 'train_station', code: 'PRG-HLN', name: 'Praha hlavní nádraží', cityCode: 'PRG', transferMins: 10 },
    { type: 'bus_station', code: 'PRG-FLO', name: 'Praha Florenc', cityCode: 'PRG', transferMins: 12 },
  ]},
  { cityCode: 'BUD', hubs: [
    { type: 'airport', code: 'BUD-APT', name: 'Budapest Liszt Ferenc', cityCode: 'BUD', transferMins: 35 },
    { type: 'train_station', code: 'BUD-KEL', name: 'Budapest Keleti', cityCode: 'BUD', transferMins: 15 },
    { type: 'bus_station', code: 'BUD-NEP', name: 'Budapest Népliget', cityCode: 'BUD', transferMins: 20 },
  ]},
  { cityCode: 'LIS', hubs: [
    { type: 'airport', code: 'LIS-APT', name: 'Lisbon Humberto Delgado', cityCode: 'LIS', transferMins: 20 },
    { type: 'train_station', code: 'LIS-ORI', name: 'Lisboa Oriente', cityCode: 'LIS', transferMins: 15 },
    { type: 'bus_station', code: 'LIS-SET', name: 'Lisbon Sete Rios', cityCode: 'LIS', transferMins: 18 },
  ]},
  { cityCode: 'DUB', hubs: [
    { type: 'airport', code: 'DUB-APT', name: 'Dublin Airport', cityCode: 'DUB', transferMins: 30 },
    { type: 'train_station', code: 'DUB-HEU', name: 'Dublin Heuston', cityCode: 'DUB', transferMins: 15 },
    { type: 'bus_station', code: 'DUB-BUS', name: 'Dublin Busáras', cityCode: 'DUB', transferMins: 10 },
  ]},
  { cityCode: 'BRU', hubs: [
    { type: 'airport', code: 'BRU-APT', name: 'Brussels Airport', cityCode: 'BRU', transferMins: 25 },
    { type: 'train_station', code: 'BRU-MID', name: 'Bruxelles-Midi', cityCode: 'BRU', transferMins: 10 },
    { type: 'bus_station', code: 'BRU-NOR', name: 'Brussels Nord Bus', cityCode: 'BRU', transferMins: 12 },
  ]},
  { cityCode: 'MUC', hubs: [
    { type: 'airport', code: 'MUC-APT', name: 'Munich Airport', cityCode: 'MUC', transferMins: 40 },
    { type: 'train_station', code: 'MUC-HBF', name: 'München Hauptbahnhof', cityCode: 'MUC', transferMins: 10 },
    { type: 'bus_station', code: 'MUC-ZOB', name: 'Munich ZOB', cityCode: 'MUC', transferMins: 12 },
  ]},
  { cityCode: 'MIL', hubs: [
    { type: 'airport', code: 'MXP', name: 'Milan Malpensa', cityCode: 'MIL', transferMins: 50 },
    { type: 'train_station', code: 'MIL-CEN', name: 'Milano Centrale', cityCode: 'MIL', transferMins: 10 },
    { type: 'bus_station', code: 'MIL-LAM', name: 'Milan Lampugnano', cityCode: 'MIL', transferMins: 20 },
  ]},
  { cityCode: 'ZRH', hubs: [
    { type: 'airport', code: 'ZRH-APT', name: 'Zurich Airport', cityCode: 'ZRH', transferMins: 15 },
    { type: 'train_station', code: 'ZRH-HBF', name: 'Zürich HB', cityCode: 'ZRH', transferMins: 10 },
    { type: 'bus_station', code: 'ZRH-SIH', name: 'Zurich Sihlquai', cityCode: 'ZRH', transferMins: 12 },
  ]},
  { cityCode: 'STO', hubs: [
    { type: 'airport', code: 'ARN', name: 'Stockholm Arlanda', cityCode: 'STO', transferMins: 40 },
    { type: 'train_station', code: 'STO-CEN', name: 'Stockholm Central', cityCode: 'STO', transferMins: 10 },
    { type: 'bus_station', code: 'STO-CIT', name: 'Stockholm Cityterminalen', cityCode: 'STO', transferMins: 10 },
  ]},
  { cityCode: 'CPH', hubs: [
    { type: 'airport', code: 'CPH-APT', name: 'Copenhagen Kastrup', cityCode: 'CPH', transferMins: 15 },
    { type: 'train_station', code: 'CPH-HBF', name: 'København H', cityCode: 'CPH', transferMins: 10 },
    { type: 'bus_station', code: 'CPH-ING', name: 'Copenhagen Ingerslevsgade', cityCode: 'CPH', transferMins: 12 },
  ]},
  { cityCode: 'WAW', hubs: [
    { type: 'airport', code: 'WAW-APT', name: 'Warsaw Chopin', cityCode: 'WAW', transferMins: 30 },
    { type: 'train_station', code: 'WAW-CEN', name: 'Warszawa Centralna', cityCode: 'WAW', transferMins: 10 },
    { type: 'bus_station', code: 'WAW-ZAC', name: 'Warsaw Zachodnia Bus', cityCode: 'WAW', transferMins: 15 },
  ]},
  { cityCode: 'KRK', hubs: [
    { type: 'airport', code: 'KRK-APT', name: 'Kraków Balice', cityCode: 'KRK', transferMins: 30 },
    { type: 'train_station', code: 'KRK-GLO', name: 'Kraków Główny', cityCode: 'KRK', transferMins: 10 },
    { type: 'bus_station', code: 'KRK-MDA', name: 'Kraków MDA', cityCode: 'KRK', transferMins: 12 },
  ]},
  { cityCode: 'ATH', hubs: [
    { type: 'airport', code: 'ATH-APT', name: 'Athens Eleftherios Venizelos', cityCode: 'ATH', transferMins: 45 },
    { type: 'train_station', code: 'ATH-LAR', name: 'Athens Larissa', cityCode: 'ATH', transferMins: 15 },
    { type: 'bus_station', code: 'ATH-KIF', name: 'Athens Kifissos', cityCode: 'ATH', transferMins: 20 },
  ]},
  { cityCode: 'IST', hubs: [
    { type: 'airport', code: 'IST-APT', name: 'Istanbul Airport', cityCode: 'IST', transferMins: 50 },
    { type: 'train_station', code: 'IST-SIR', name: 'Istanbul Sirkeci', cityCode: 'IST', transferMins: 20 },
    { type: 'bus_station', code: 'IST-OTO', name: 'Istanbul Otogar', cityCode: 'IST', transferMins: 25 },
  ]},
  { cityCode: 'EDI', hubs: [
    { type: 'airport', code: 'EDI-APT', name: 'Edinburgh Airport', cityCode: 'EDI', transferMins: 25 },
    { type: 'train_station', code: 'EDI-WAV', name: 'Edinburgh Waverley', cityCode: 'EDI', transferMins: 10 },
    { type: 'bus_station', code: 'EDI-BUS', name: 'Edinburgh Bus Station', cityCode: 'EDI', transferMins: 10 },
  ]},
  { cityCode: 'NCE', hubs: [
    { type: 'airport', code: 'NCE-APT', name: "Nice Côte d'Azur", cityCode: 'NCE', transferMins: 20 },
    { type: 'train_station', code: 'NCE-VIL', name: 'Nice-Ville', cityCode: 'NCE', transferMins: 10 },
    { type: 'bus_station', code: 'NCE-VAU', name: 'Nice Vauban', cityCode: 'NCE', transferMins: 12 },
  ]},
  { cityCode: 'OPO', hubs: [
    { type: 'airport', code: 'OPO-APT', name: 'Porto Francisco Sá Carneiro', cityCode: 'OPO', transferMins: 25 },
    { type: 'train_station', code: 'OPO-CAM', name: 'Porto Campanhã', cityCode: 'OPO', transferMins: 10 },
    { type: 'bus_station', code: 'OPO-BUS', name: 'Porto Campo 24 de Agosto', cityCode: 'OPO', transferMins: 12 },
  ]},
  { cityCode: 'LYS', hubs: [
    { type: 'airport', code: 'LYS-APT', name: 'Lyon Saint-Exupéry', cityCode: 'LYS', transferMins: 30 },
    { type: 'train_station', code: 'LYS-PD', name: 'Lyon Part-Dieu', cityCode: 'LYS', transferMins: 10 },
    { type: 'bus_station', code: 'LYS-PER', name: 'Lyon Perrache Bus', cityCode: 'LYS', transferMins: 12 },
  ]},
  { cityCode: 'HAM', hubs: [
    { type: 'airport', code: 'HAM-APT', name: 'Hamburg Airport', cityCode: 'HAM', transferMins: 25 },
    { type: 'train_station', code: 'HAM-HBF', name: 'Hamburg Hauptbahnhof', cityCode: 'HAM', transferMins: 10 },
    { type: 'bus_station', code: 'HAM-ZOB', name: 'Hamburg ZOB', cityCode: 'HAM', transferMins: 12 },
  ]},
  { cityCode: 'FLR', hubs: [
    { type: 'airport', code: 'FLR-APT', name: 'Florence Peretola', cityCode: 'FLR', transferMins: 20 },
    { type: 'train_station', code: 'FLR-SMN', name: 'Firenze Santa Maria Novella', cityCode: 'FLR', transferMins: 10 },
    { type: 'bus_station', code: 'FLR-BUS', name: 'Florence SITA Bus', cityCode: 'FLR', transferMins: 12 },
  ]},
  { cityCode: 'OSL', hubs: [
    { type: 'airport', code: 'OSL-APT', name: 'Oslo Gardermoen', cityCode: 'OSL', transferMins: 35 },
    { type: 'train_station', code: 'OSL-CEN', name: 'Oslo Sentralstasjon', cityCode: 'OSL', transferMins: 10 },
    { type: 'bus_station', code: 'OSL-BUS', name: 'Oslo Bussterminal', cityCode: 'OSL', transferMins: 10 },
  ]},
  { cityCode: 'HEL', hubs: [
    { type: 'airport', code: 'HEL-APT', name: 'Helsinki Vantaa', cityCode: 'HEL', transferMins: 30 },
    { type: 'train_station', code: 'HEL-CEN', name: 'Helsinki Central', cityCode: 'HEL', transferMins: 10 },
    { type: 'bus_station', code: 'HEL-KAM', name: 'Helsinki Kamppi', cityCode: 'HEL', transferMins: 10 },
  ]},
  { cityCode: 'BUH', hubs: [
    { type: 'airport', code: 'OTP', name: 'Bucharest Henri Coandă', cityCode: 'BUH', transferMins: 35 },
    { type: 'train_station', code: 'BUH-NOR', name: 'București Nord', cityCode: 'BUH', transferMins: 15 },
    { type: 'bus_station', code: 'BUH-MIL', name: 'Bucharest Militari', cityCode: 'BUH', transferMins: 20 },
  ]},
  { cityCode: 'SOF', hubs: [
    { type: 'airport', code: 'SOF-APT', name: 'Sofia Airport', cityCode: 'SOF', transferMins: 15 },
    { type: 'train_station', code: 'SOF-CEN', name: 'Sofia Central', cityCode: 'SOF', transferMins: 10 },
    { type: 'bus_station', code: 'SOF-BUS', name: 'Sofia Central Bus', cityCode: 'SOF', transferMins: 12 },
  ]},
  { cityCode: 'BEG', hubs: [
    { type: 'airport', code: 'BEG-APT', name: 'Belgrade Nikola Tesla', cityCode: 'BEG', transferMins: 30 },
    { type: 'train_station', code: 'BEG-CEN', name: 'Belgrade Center', cityCode: 'BEG', transferMins: 12 },
    { type: 'bus_station', code: 'BEG-BUS', name: 'Belgrade BAS', cityCode: 'BEG', transferMins: 12 },
  ]},
  { cityCode: 'ZAG', hubs: [
    { type: 'airport', code: 'ZAG-APT', name: 'Zagreb Franjo Tuđman', cityCode: 'ZAG', transferMins: 25 },
    { type: 'train_station', code: 'ZAG-GK', name: 'Zagreb Glavni Kolodvor', cityCode: 'ZAG', transferMins: 10 },
    { type: 'bus_station', code: 'ZAG-BUS', name: 'Zagreb Bus Station', cityCode: 'ZAG', transferMins: 10 },
  ]},
  { cityCode: 'BTS', hubs: [
    { type: 'airport', code: 'BTS-APT', name: 'Bratislava M. R. Štefánik', cityCode: 'BTS', transferMins: 20 },
    { type: 'train_station', code: 'BTS-HLN', name: 'Bratislava hlavná stanica', cityCode: 'BTS', transferMins: 10 },
    { type: 'bus_station', code: 'BTS-BUS', name: 'Bratislava AS Mlynské Nivy', cityCode: 'BTS', transferMins: 10 },
  ]},
  { cityCode: 'LJU', hubs: [
    { type: 'airport', code: 'LJU-APT', name: 'Ljubljana Jože Pučnik', cityCode: 'LJU', transferMins: 30 },
    { type: 'train_station', code: 'LJU-TRN', name: 'Ljubljana Central', cityCode: 'LJU', transferMins: 10 },
    { type: 'bus_station', code: 'LJU-BUS', name: 'Ljubljana Bus Station', cityCode: 'LJU', transferMins: 10 },
  ]},
];

const hubsByCity = new Map<string, TransportHub[]>();
const hubByCode = new Map<string, TransportHub>();

HUBS.forEach(({ cityCode, hubs }) => {
  hubsByCity.set(cityCode, hubs);
  hubs.forEach(hub => hubByCode.set(hub.code, hub));
});

export function getHubsForCity(cityCode: string): TransportHub[] {
  return hubsByCity.get(cityCode) || [];
}

export function getHubByCode(code: string): TransportHub | undefined {
  return hubByCode.get(code);
}

export function cityHasHub(cityCode: string, hubCode: string): boolean {
  return getHubsForCity(cityCode).some(h => h.code === hubCode);
}
