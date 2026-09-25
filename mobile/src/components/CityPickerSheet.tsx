import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from './ui/Sheet';
import { useTheme } from '../contexts/ThemeContext';
import type { City } from '../data/cities';
import { matchCities, popularCities, countryFlag } from '../data/cityMatch';
import { radius } from '../constants/theme';
import { haptic } from '../utils/haptics';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelect: (city: City) => void;
  recent?: City[];
  /** The city picked on the other side, so it can't be chosen twice. */
  excludeCode?: string;
  testID: string;
}

export function CityPickerSheet({ visible, title, onClose, onSelect, recent = [], excludeCode, testID }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  // Keyboard highlight (web / hardware keyboards); -1 = nothing highlighted.
  const [highlight, setHighlight] = useState(-1);

  const matches = matchCities(query).filter(c => c.code !== excludeCode);

  function pick(city: City) {
    haptic.tap();
    setQuery('');
    setHighlight(-1);
    onSelect(city);
  }

  function handleKeyPress(e: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (matches.length === 0) return;
    const key = e.nativeEvent.key;
    if (key === 'ArrowDown') setHighlight(h => Math.min(h + 1, matches.length - 1));
    else if (key === 'ArrowUp') setHighlight(h => Math.max(h - 1, 0));
    else if (key === 'Enter') pick(matches[highlight >= 0 ? highlight : 0]);
  }

  function handleSubmit() {
    if (matches.length > 0) pick(matches[highlight >= 0 ? highlight : 0]);
  }

  const row = (city: City, i: number, icon: keyof typeof Ionicons.glyphMap = 'location-outline') => (
    <Pressable
      key={city.code}
      testID={`${testID}-option-${city.code}`}
      onPress={() => pick(city)}
      accessibilityRole="button"
      accessibilityLabel={`${city.name}, ${city.country}`}
      accessibilityState={{ selected: i === highlight }}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        (pressed || i === highlight) && { backgroundColor: colors.accentSoft },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={17} color={colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cityName, { color: colors.text }]}>{city.name}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {countryFlag(city.country)}  {city.country} · All stations
        </Text>
      </View>
      <Text style={[styles.code, { color: colors.textTertiary }]}>{city.code}</Text>
    </Pressable>
  );

  const recents = recent.filter(c => c.code !== excludeCode).slice(0, 4);
  const popular = popularCities().filter(c => c.code !== excludeCode && !recents.some(r => r.code === c.code));

  return (
    <Sheet visible={visible} onClose={onClose} title={title} testID={testID}>
      <View style={[styles.searchBox, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          testID={`${testID}-input`}
          autoFocus
          value={query}
          onChangeText={t => {
            setQuery(t);
            setHighlight(-1);
          }}
          onKeyPress={handleKeyPress}
          onSubmitEditing={handleSubmit}
          placeholder="City, station or code"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { color: colors.text }]}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" style={{ marginTop: 8 }} contentContainerStyle={{ paddingBottom: 12 }}>
        {query.trim() ? (
          matches.length > 0 ? (
            matches.map((c, i) => row(c, i))
          ) : (
            <Text testID={`${testID}-empty`} style={[styles.empty, { color: colors.textSecondary }]}>
              No matching cities
            </Text>
          )
        ) : (
          <>
            {recents.length > 0 && (
              <>
                <Text style={[styles.section, { color: colors.textSecondary }]}>RECENT</Text>
                {recents.map(c => row(c, -1, 'time-outline'))}
              </>
            )}
            <Text style={[styles.section, { color: colors.textSecondary }]}>POPULAR</Text>
            {popular.map(c => row(c, -1, 'flame-outline'))}
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, paddingHorizontal: 12, minHeight: 46 },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cityName: { fontSize: 16, fontWeight: '600' },
  code: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  empty: { textAlign: 'center', marginTop: 24 },
});
