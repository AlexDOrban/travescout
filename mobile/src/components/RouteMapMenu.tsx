import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import type { ColorPalette } from '../constants/colors';
import { routeStops, googleMapsUrl, appleMapsUrl } from '../utils/maps';

interface Props {
  /** Ordered origin..destination codes for the trip's legs. */
  codes: string[];
  colors: ColorPalette;
  testID?: string;
}

// A dropdown that opens the trip's route in Apple Maps or Google Maps.
export function RouteMapMenu({ codes, colors, testID }: Props) {
  const [open, setOpen] = useState(false);
  const stops = routeStops(codes);
  if (stops.length < 2) return null;

  const options = (
    Platform.OS === 'ios'
      ? [
          { key: 'apple', label: 'Apple Maps', url: appleMapsUrl(stops) },
          { key: 'google', label: 'Google Maps', url: googleMapsUrl(stops) },
        ]
      : [
          { key: 'google', label: 'Google Maps', url: googleMapsUrl(stops) },
          { key: 'apple', label: 'Apple Maps', url: appleMapsUrl(stops) },
        ]
  ).filter(o => o.url);

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
          {stops.length > 2 ? (
            <Text style={[styles.routeLine, { color: colors.textSecondary, borderBottomColor: colors.border }]}>
              {stops.join('  →  ')}
            </Text>
          ) : null}
          {options.map((o, i) => (
            <TouchableOpacity
              key={o.key}
              testID={`route-map-${o.key}`}
              onPress={() => openUrl(o.url)}
              style={[
                styles.item,
                i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Text style={{ color: colors.text }}>Open in {o.label}</Text>
            </TouchableOpacity>
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
  routeLine: {
    fontSize: 12,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
