import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { BookedTrip } from '../types/booking';
import { TRANSPORT_ICON, PROVIDER_TRANSPORT } from '../constants/transport';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  leg: BookedTrip;
  colors: {
    text: string;
    textSecondary: string;
    card: string;
    border: string;
    background: string;
    accent: string;
    cheapest: string;
    error: string;
  };
  format: (n: number) => string;
}

export function ExpandableLeg({ leg, colors, format }: Props) {
  const [expanded, setExpanded] = useState(false);

  const transport = PROVIDER_TRANSPORT[leg.provider] ?? 'bus';
  const icon = TRANSPORT_ICON[transport] ?? '🚐';

  function handleToggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(v => !v);
  }

  const departDate = new Date(leg.depart_at);
  const departStr = departDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity
      onPress={handleToggle}
      style={[styles.legCard, { borderColor: colors.border, backgroundColor: colors.background }]}
      activeOpacity={0.8}
      testID="expandable-leg"
    >
      {/* Collapsed view — always visible */}
      <View style={styles.legHeader}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.route, { color: colors.text }]}>
            {leg.origin} → {leg.destination}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            {leg.booking_ref}
          </Text>
        </View>
        <Text
          style={[
            styles.status,
            { color: leg.status === 'confirmed' ? colors.cheapest : colors.textSecondary },
          ]}
        >
          {leg.status}
        </Text>
        <Text style={[styles.chevron, { color: colors.textSecondary }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </View>

      {/* Expanded view */}
      {expanded && (
        <View style={[styles.legDetail, { borderTopColor: colors.border }]}>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Provider</Text>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
              {leg.provider}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Departs</Text>
            <Text style={{ color: colors.text, fontSize: 13 }}>
              {departDate.toLocaleDateString()} at {departStr}
            </Text>
          </View>
          {leg.arrive_at ? (
            <View style={styles.detailRow}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Arrives</Text>
              <Text style={{ color: colors.text, fontSize: 13 }}>
                {new Date(leg.arrive_at).toLocaleDateString()} at{' '}
                {new Date(leg.arrive_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Price</Text>
            <Text style={[styles.price, { color: colors.cheapest }]}>
              {format(parseFloat(leg.price_eur))}
            </Text>
          </View>

          {leg.ticket_qr_data ? (
            <View
              testID="qr-code"
              style={[styles.qrContainer, { borderColor: colors.border }]}
            >
              <QRCode value={leg.ticket_qr_data} size={120} />
              <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '700', marginTop: 8, letterSpacing: 1 }}>
                {leg.booking_ref}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                Scan at boarding
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  legCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  legHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  route: {
    fontSize: 14,
    fontWeight: '600',
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginRight: 6,
  },
  chevron: {
    fontSize: 10,
  },
  legDetail: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
  },
  qrContainer: {
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
