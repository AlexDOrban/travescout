import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { AppHeader } from '../../src/components/AppHeader';
import { CityAutocomplete } from '../../src/components/CityAutocomplete';
import { search } from '../../src/api/search';
import { setSearchResults } from '../../src/stores/searchStore';
import type { City } from '../../src/data/cities';
import { formatDateInput } from '../../src/utils/date';

export default function SearchScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [fromCity, setFromCity] = useState<City | null>(null);
  const [toCity, setToCity] = useState<City | null>(null);
  const [departDate, setDepartDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validateDate(value: string, label: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${label} must be YYYY-MM-DD`;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return `${label} is not a valid calendar date`;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return `${label} cannot be in the past`;
    return '';
  }

  async function handleSearch() {
    setError('');
    if (!fromCity) return setError('Select a departure city');
    if (!toCity) return setError('Select a destination city');
    if (fromCity.code === toCity.code) return setError('Departure and destination must differ');
    if (!departDate) return setError('Enter a departure date');
    const departError = validateDate(departDate, 'Departure date');
    if (departError) return setError(departError);

    setLoading(true);
    try {
      const data = await search({
        from: fromCity.code,
        to: toCity.code,
        departDate,
        adults,
      });
      setSearchResults(data.results, data.meta);
      router.push('/results');
    } catch (e: any) {
      setError(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <AppHeader />
      <View style={styles.form}>
        <CityAutocomplete
          label="From"
          value=""
          onSelect={setFromCity}
          onClear={() => setFromCity(null)}
          testID="from-city"
        />
        <CityAutocomplete
          label="To"
          value=""
          onSelect={setToCity}
          onClear={() => setToCity(null)}
          testID="to-city"
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Departure date
        </Text>
        <TextInput
          testID="depart-date"
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
          value={departDate}
          onChangeText={t => setDepartDate(formatDateInput(t, departDate))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          maxLength={10}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Passengers</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            testID="adults-minus"
            onPress={() => setAdults(a => Math.max(1, a - 1))}
            style={[styles.stepperBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontSize: 20 }}>−</Text>
          </TouchableOpacity>
          <Text
            testID="adults-count"
            style={[styles.stepperValue, { color: colors.text }]}
          >
            {adults}
          </Text>
          <TouchableOpacity
            testID="adults-plus"
            onPress={() => setAdults(a => Math.min(9, a + 1))}
            style={[styles.stepperBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontSize: 20 }}>+</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <Text testID="error" style={{ color: colors.error, marginTop: 8 }}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          testID="search-btn"
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 16, gap: 12 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: {
    borderWidth: 1,
    borderRadius: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  button: { borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
