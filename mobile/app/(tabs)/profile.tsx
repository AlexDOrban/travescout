import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { Toast, useToast } from '../../src/components/ui/Toast';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme, type ThemeMode } from '../../src/contexts/ThemeContext';
import { useCurrency, type Currency } from '../../src/contexts/CurrencyContext';
import { clearRecentSearches } from '../../src/utils/recentSearches';

function Row({
  icon,
  label,
  onPress,
  testID,
  detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
  detail?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={17} color={colors.accent} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      {detail ? <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{detail}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const { currency, currencies, setCurrency } = useCurrency();
  const router = useRouter();
  const toast = useToast();

  const email = user?.email ?? '';
  const initial = email[0]?.toUpperCase() ?? '?';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  function confirmLogout() {
    // Alert.alert has no buttons on web; log out directly there.
    if (Platform.OS === 'web') {
      void logout();
      return;
    }
    Alert.alert('Log out?', 'You’ll need to sign in again to see your tickets.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  async function clearRecents() {
    await clearRecentSearches(email || 'anon');
    toast.show('Recent searches cleared');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Account" large />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarText, { color: colors.onAccent }]}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>SIGNED IN AS</Text>
            <Text numberOfLines={1} style={[styles.email, { color: colors.text }]}>{email}</Text>
          </View>
        </Card>

        <Text style={[styles.section, { color: colors.textSecondary }]}>PREFERENCES</Text>
        <Card>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Appearance</Text>
          <SegmentedControl<ThemeMode>
            testIDPrefix="theme"
            value={mode}
            onChange={setMode}
            segments={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <Text style={[styles.settingLabel, { color: colors.text, marginTop: 18 }]}>Currency</Text>
          <SegmentedControl<Currency['code']>
            testIDPrefix="currency"
            value={currency.code}
            onChange={code => setCurrency(currencies.find(c => c.code === code)!)}
            segments={currencies.map(c => ({ value: c.code, label: `${c.symbol} ${c.code}` }))}
          />
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            Prices are charged in EUR; other currencies are estimates at today’s rate.
          </Text>
        </Card>

        <Text style={[styles.section, { color: colors.textSecondary }]}>TRAVEL</Text>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <Row icon="ticket-outline" label="My trips" onPress={() => router.navigate('/(tabs)/trips')} testID="row-trips" />
          <View style={[styles.sep, { backgroundColor: colors.border }]} />
          <Row icon="notifications-outline" label="Price alerts" onPress={() => router.navigate('/(tabs)/alerts')} testID="row-alerts" />
          <View style={[styles.sep, { backgroundColor: colors.border }]} />
          <Row icon="time-outline" label="Clear recent searches" onPress={clearRecents} testID="clear-recents" />
        </Card>

        <Text style={[styles.section, { color: colors.textSecondary }]}>ABOUT</Text>
        <Card>
          <View style={styles.aboutRow}>
            <Text style={{ color: colors.text, fontSize: 15 }}>Version</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{version}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={{ color: colors.text, fontSize: 15 }}>Payments</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Stripe test mode</Text>
          </View>
        </Card>

        <Button testID="logout-btn" title="Log out" icon="log-out-outline" variant="danger" onPress={confirmLogout} style={{ marginTop: 24 }} />
      </ScrollView>
      <Toast message={toast.message} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 48 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  email: { fontSize: 17, fontWeight: '700', marginTop: 2 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 24, marginBottom: 8, marginLeft: 4 },
  settingLabel: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  hint: { fontSize: 12, marginTop: 10, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  rowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
});
