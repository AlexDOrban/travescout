import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MapTravelMode } from './maps';

// Per-booking ground-transfer preferences: where the traveller actually
// leaves from, their final destination (hotel…), and the preferred travel
// mode for airport access. Stored on-device, keyed by booking ref.
export interface TransferPrefs {
  startAddress: string;
  endAddress: string;
  travelMode: MapTravelMode;
}

const keyFor = (ref: string) => `transfer:${ref}`;

export async function saveTransferPrefs(ref: string, prefs: TransferPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(ref), JSON.stringify(prefs));
  } catch {
    // Losing a stored preference is not worth surfacing an error.
  }
}

export async function getTransferPrefs(ref: string): Promise<TransferPrefs | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(ref));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      startAddress: typeof parsed.startAddress === 'string' ? parsed.startAddress : '',
      endAddress: typeof parsed.endAddress === 'string' ? parsed.endAddress : '',
      travelMode: parsed.travelMode ?? 'transit',
    };
  } catch {
    return null;
  }
}
