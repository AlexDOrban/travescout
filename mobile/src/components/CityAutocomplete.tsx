import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { CITIES, City } from '../data/cities';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  label: string;
  value: string;
  onSelect: (city: City) => void;
  /** Called when the user edits the text after a selection, invalidating it. */
  onClear?: () => void;
  testID?: string;
}

export function CityAutocomplete({ label, value, onSelect, onClear, testID }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = query.length >= 1
    ? CITIES.filter(
        c =>
          c.name.toLowerCase().startsWith(query.toLowerCase()) ||
          c.code.toLowerCase().startsWith(query.toLowerCase()),
      ).slice(0, 5)
    : [];

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    setShowDropdown(true);
    // Typing invalidates any previously selected city; otherwise the search
    // silently uses the old selection while the input shows new text.
    onClear?.();
  }, [onClear]);

  const handleSelect = useCallback(
    (city: City) => {
      setQuery(`${city.name} (${city.code})`);
      setShowDropdown(false);
      onSelect(city);
    },
    [onSelect],
  );

  return (
    <View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        testID={testID}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
        ]}
        value={query}
        onChangeText={handleChangeText}
        placeholder="City or code"
        placeholderTextColor={colors.textSecondary}
      />
      {showDropdown && query.length >= 1 && filtered.length === 0 && (
        <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.option, { borderBottomColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary }}>No matching cities</Text>
          </View>
        </View>
      )}
      {showDropdown && filtered.length > 0 && (
        <View
          testID={`${testID}-dropdown`}
          style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {filtered.map(city => (
            <TouchableOpacity
              key={city.code}
              testID={`${testID}-option-${city.code}`}
              style={[styles.option, { borderBottomColor: colors.border }]}
              onPress={() => handleSelect(city)}
            >
              <Text style={{ color: colors.text }}>
                {city.name} ({city.code})
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{city.country}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  dropdown: { borderWidth: 1, borderRadius: 8, marginTop: 4 },
  option: { padding: 12, borderBottomWidth: 1 },
});
