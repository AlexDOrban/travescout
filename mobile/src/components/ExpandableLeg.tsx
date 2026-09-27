import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import type { BookedTrip } from '../types/booking';
import type { ColorPalette } from '../constants/colors';
import { PROVIDER_TRANSPORT, providerName } from '../constants/transport';
import { formatDateTime, formatTime } from '../utils/format';
import { ModeBadge } from './ModeBadge';
import { haptic } from '../utils/haptics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  leg: BookedTrip;
  colors: ColorPalette;
  format: (n: number) => string;
}

export function ExpandableLeg({ leg, colors, format }: Props) {
  const [expanded, setExpanded] = useState(false);

  const transport = PROVIDER_TRANSPORT[leg.provider] ?? 'bus';
  const confirmed = leg.status === 'confirmed';

  function handleToggle() {
    haptic.tap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(v => !v);
  }

  return (
    <Pressable
      onPress={handleToggle}
      style={[styles.legCard, { borderColor: colors.border, backgroundColor: colors.background }]}
      testID="expandable-leg"
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${leg.origin} to ${leg.destination}, ${expanded ? 'hide' : 'show'} ticket`}
    >
      <View style={styles.legHeader}>
        <ModeBadge mode={transport} size={32} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.route, { color: colors.text }]}>
            {leg.origin} → {leg.destination}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>
            {formatTime(leg.depart_at)}
            {leg.arrive_at ? ` – ${formatTime(leg.arrive_at)}` : ''} · {providerName(leg.provider)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text
            style={[styles.status, { color: confirmed ? colors.cheapest : colors.warning }]}
          >
            {leg.status === 'failed' ? 'Not booked · not charged' : leg.status}
          </Text>
          <View style={styles.showRow}>
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700' }}>
              {expanded ? 'Hide' : 'Ticket'}
            </Text>
            <Ionicons name={expanded ? 'chevron-up' : 'qr-code-outline'} size={13} color={colors.accent} />
          </View>
        </View>
      </View>

      {expanded && (
        <View style={[styles.legDetail, { borderTopColor: colors.border }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Booking ref</Text>
            <Text style={[styles.detailValue, { color: colors.text, letterSpacing: 0.5 }]}>{leg.booking_ref}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Departs</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(leg.depart_at)}</Text>
          </View>
          {leg.arrive_at ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Arrives</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(leg.arrive_at)}</Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Price</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{format(parseFloat(leg.price_eur))}</Text>
          </View>

          {leg.ticket_qr_data ? (
            <View testID="qr-code" style={styles.qrContainer}>
              <QRCode value={leg.ticket_qr_data} size={150} />
              <Text style={styles.qrRef}>{leg.booking_ref}</Text>
              <Text style={styles.qrHint}>Show this code when boarding</Text>
            </View>
          ) : null}
        </View>
      )}
      {!expanded && (
        // Keep the reference visible (and searchable) on the collapsed ticket.
        <Text style={[styles.refCollapsed, { color: colors.textTertiary }]}>{leg.booking_ref}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  legCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
  legHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  route: { fontSize: 15, fontWeight: '700' },
  right: { alignItems: 'flex-end', gap: 3 },
  status: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  showRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  refCollapsed: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginTop: 6, marginLeft: 42 },
  legDetail: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '600' },
  qrContainer: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  qrRef: { color: '#0b1b33', fontSize: 15, fontWeight: '800', marginTop: 10, letterSpacing: 1 },
  qrHint: { color: '#56657b', fontSize: 12, marginTop: 2 },
});
