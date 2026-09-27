import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ColorPalette } from '../constants/colors';
import {
  groundSegments,
  segmentGoogleUrl,
  segmentAppleUrl,
  type RouteLegInput,
  type MapSegment,
  type MapTravelMode,
} from '../utils/maps';
import { getTransferPrefs, saveTransferPrefs, type TransferPrefs } from '../utils/transferPrefs';
import { reversePrefs } from '../utils/roundTrip';
import { TravelModeChips } from './TravelModeChips';

interface Props {
  /** Ordered legs of the trip; flight legs are shown as airport access only. */
  legs: RouteLegInput[];
  colors: ColorPalette;
  /**
   * Booking ref to load/persist the transfer details under, so addresses and
   * mode chosen at checkout (or edited here) stick for the whole trip.
   */
  storageKey?: string;
  /** Seed values when nothing is stored yet (e.g. mid-checkout). */
  initialPrefs?: TransferPrefs;
  /** Reports every edit — lets checkout screens keep their store in sync. */
  onChange?: (prefs: TransferPrefs) => void;
  /** Return direction: edit/show the addresses swapped; stored prefs stay home → stay. */
  reversed?: boolean;
  testID?: string;
}

function segmentTitle(seg: MapSegment): string {
  if (seg.kind === 'to-airport') {
    const from = seg.fromCurrentLocation ? 'Your location' : seg.stops[0];
    return `🛫  To airport: ${from} → ${seg.stops[seg.stops.length - 1]}`;
  }
  if (seg.kind === 'from-airport') {
    return `🛬  From airport: ${seg.stops.join(' → ')}`;
  }
  return `🚌  ${seg.stops.join(' → ')}`;
}

// A dropdown that opens the trip's ground route segments in Apple Maps or
// Google Maps. Flights can't be drawn by map apps, so each flight leg is
// replaced by directions to the departure airport and from the arrival one.
// The user can type where they actually leave from and their final
// destination (e.g. a hotel), and pick the travel mode for the links.
export function RouteMapMenu({ legs, colors, storageKey, initialPrefs, onChange, reversed = false, testID }: Props) {
  const flip = (p: TransferPrefs): TransferPrefs => (reversed ? reversePrefs(p) : p);
  const seed = initialPrefs ? flip(initialPrefs) : undefined;
  const [open, setOpen] = useState(false);
  const [startAddress, setStartAddress] = useState(seed?.startAddress ?? '');
  const [endAddress, setEndAddress] = useState(seed?.endAddress ?? '');
  const [mode, setMode] = useState<MapTravelMode>(seed?.travelMode ?? 'transit');

  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;
    getTransferPrefs(storageKey).then(prefs => {
      if (!prefs || cancelled) return;
      const shown = reversed ? reversePrefs(prefs) : prefs;
      setStartAddress(shown.startAddress);
      setEndAddress(shown.endAddress);
      setMode(shown.travelMode);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey, reversed]);

  function update(next: { startAddress?: string; endAddress?: string; mode?: MapTravelMode }) {
    const merged = {
      startAddress: next.startAddress ?? startAddress,
      endAddress: next.endAddress ?? endAddress,
      travelMode: next.mode ?? mode,
    };
    if (next.startAddress !== undefined) setStartAddress(next.startAddress);
    if (next.endAddress !== undefined) setEndAddress(next.endAddress);
    if (next.mode !== undefined) setMode(next.mode);
    const stored = flip(merged);
    if (storageKey) void saveTransferPrefs(storageKey, stored);
    onChange?.(stored);
  }

  const segments = groundSegments(legs, { startAddress, endAddress });
  if (segments.length === 0) return null;

  const hasFlight = legs.some(l => l.transportType === 'flight');

  // Native map first per platform.
  const apps =
    Platform.OS === 'ios'
      ? ([
          { key: 'apple', label: 'Apple Maps', url: segmentAppleUrl },
          { key: 'google', label: 'Google Maps', url: segmentGoogleUrl },
        ] as const)
      : ([
          { key: 'google', label: 'Google Maps', url: segmentGoogleUrl },
          { key: 'apple', label: 'Apple Maps', url: segmentAppleUrl },
        ] as const);

  async function openUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      // Nothing installed to handle it — silently ignore.
    }
  }

  const inputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
  ];

  return (
    <View>
      <TouchableOpacity
        testID={testID ?? 'route-map-toggle'}
        onPress={() => setOpen(o => !o)}
        style={[styles.toggle, { borderColor: colors.border, backgroundColor: colors.card }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="View route on map"
      >
        <View style={styles.toggleLabel}>
          <Ionicons name="map-outline" size={18} color={colors.accent} />
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>Getting there · view on map</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {open && (
        <View
          testID="route-map-menu"
          style={[styles.menu, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          {hasFlight ? (
            <Text style={[styles.note, { color: colors.textSecondary, borderBottomColor: colors.border }]}>
              Flights can’t be shown on the map — these are the ground connections to and from
              the airports.
            </Text>
          ) : null}

          <View style={[styles.endpoints, { borderBottomColor: colors.border }]}>
            <TextInput
              testID="route-start-address"
              style={inputStyle}
              value={startAddress}
              onChangeText={v => update({ startAddress: v })}
              placeholder="Leaving from (hotel, address…)"
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              testID="route-end-address"
              style={inputStyle}
              value={endAddress}
              onChangeText={v => update({ endAddress: v })}
              placeholder="Final destination (hotel, address…)"
              placeholderTextColor={colors.textSecondary}
            />
            <TravelModeChips
              mode={mode}
              onChange={m => update({ mode: m })}
              colors={colors}
              testIDPrefix="route-mode"
            />
          </View>

          {segments.map((seg, i) => (
            <View
              key={`${seg.kind}-${i}`}
              testID={`route-segment-${i}`}
              style={[
                styles.segment,
                i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Text style={[styles.segmentTitle, { color: colors.text }]}>{segmentTitle(seg)}</Text>
              <View style={styles.appRow}>
                {apps.map(app => (
                  <TouchableOpacity
                    key={app.key}
                    testID={`route-segment-${i}-${app.key}`}
                    onPress={() => openUrl(app.url(seg, mode))}
                    style={[styles.appBtn, { backgroundColor: colors.accentSoft }]}
                  >
                    <Ionicons name={app.key === 'apple' ? 'logo-apple' : 'logo-google'} size={14} color={colors.accent} />
                    <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>{app.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  toggleLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menu: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
  },
  note: {
    fontSize: 12,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  endpoints: {
    padding: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  segmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  appRow: {
    flexDirection: 'row',
    gap: 8,
  },
  appBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
