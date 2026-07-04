import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import type { ColorPalette } from '../constants/colors';
import {
  groundSegments,
  segmentGoogleUrl,
  segmentAppleUrl,
  type RouteLegInput,
  type MapSegment,
} from '../utils/maps';

interface Props {
  /** Ordered legs of the trip; flight legs are shown as airport access only. */
  legs: RouteLegInput[];
  colors: ColorPalette;
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
export function RouteMapMenu({ legs, colors, testID }: Props) {
  const [open, setOpen] = useState(false);
  const segments = groundSegments(legs);
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
    setOpen(false);
    try {
      await Linking.openURL(url);
    } catch {
      // Nothing installed to handle it — silently ignore.
    }
  }

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
        <Text style={{ color: colors.accent, fontWeight: '600' }}>🗺  View route on map</Text>
        <Text style={{ color: colors.textSecondary }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View
          testID="route-map-menu"
          style={[styles.menu, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          {hasFlight ? (
            <Text style={[styles.note, { color: colors.textSecondary, borderBottomColor: colors.border }]}>
              Flights can’t be shown on the map — these are the ground connections. Transit is
              preselected; you can switch to taxi, bike or other modes in the map app.
            </Text>
          ) : null}
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
                    onPress={() => openUrl(app.url(seg))}
                    style={[styles.appBtn, { borderColor: colors.border }]}
                  >
                    <Text style={{ color: colors.accent, fontSize: 13 }}>{app.label}</Text>
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menu: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
  },
  note: {
    fontSize: 12,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
