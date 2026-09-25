import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from './ui/Sheet';
import { useTheme } from '../contexts/ThemeContext';
import { daysInMonth } from '../utils/date';
import { addDays, monthName, parseISODate, toISODate, todayISO } from '../utils/format';
import { radius } from '../constants/theme';
import { haptic } from '../utils/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  value: string; // YYYY-MM-DD
  onSelect: (iso: string) => void;
  testID: string;
  /** Earliest selectable day; defaults to today. */
  minDate?: string;
  /** How many months ahead can be browsed. */
  monthsAhead?: number;
}

const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function CalendarSheet({ visible, onClose, value, onSelect, testID, minDate, monthsAhead = 11 }: Props) {
  const { colors } = useTheme();
  const min = minDate ?? todayISO();
  const initial = parseISODate(value || min);
  const [cursor, setCursor] = useState({ y: initial.getFullYear(), m: initial.getMonth() });

  const minD = parseISODate(min);
  const monthIndex = (y: number, m: number) => y * 12 + m;
  const firstIdx = monthIndex(minD.getFullYear(), minD.getMonth());
  const curIdx = monthIndex(cursor.y, cursor.m);
  const canPrev = curIdx > firstIdx;
  const canNext = curIdx < firstIdx + monthsAhead;

  function shift(delta: number) {
    haptic.tap();
    const idx = curIdx + delta;
    setCursor({ y: Math.floor(idx / 12), m: idx % 12 });
  }

  function choose(iso: string) {
    haptic.tap();
    onSelect(iso);
  }

  // Monday-first grid.
  const lead = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;
  const total = daysInMonth(cursor.y, cursor.m + 1);
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) => toISODate(new Date(cursor.y, cursor.m, i + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const quick = [
    { key: 'today', label: 'Today', iso: min },
    { key: 'tomorrow', label: 'Tomorrow', iso: addDays(min, 1) },
    { key: 'week', label: 'In a week', iso: addDays(min, 7) },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title="Departure date" testID={testID}>
      <View style={styles.quickRow}>
        {quick.map(q => {
          const active = q.iso === value;
          return (
            <Pressable
              key={q.key}
              testID={`${testID}-${q.key}`}
              onPress={() => choose(q.iso)}
              style={[styles.quick, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accentSoft : 'transparent' }]}
            >
              <Text style={{ color: active ? colors.accent : colors.text, fontWeight: '600', fontSize: 13 }}>{q.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.monthHeader}>
        <Pressable
          testID={`${testID}-prev`}
          onPress={() => canPrev && shift(-1)}
          disabled={!canPrev}
          hitSlop={10}
          accessibilityLabel="Previous month"
          style={[styles.nav, { backgroundColor: colors.surfaceAlt, opacity: canPrev ? 1 : 0.35 }]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <Text testID={`${testID}-month`} style={[styles.monthTitle, { color: colors.text }]}>
          {monthName(cursor.m)} {cursor.y}
        </Text>
        <Pressable
          testID={`${testID}-next`}
          onPress={() => canNext && shift(1)}
          disabled={!canNext}
          hitSlop={10}
          accessibilityLabel="Next month"
          style={[styles.nav, { backgroundColor: colors.surfaceAlt, opacity: canNext ? 1 : 0.35 }]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEK.map(d => (
          <Text key={d} style={[styles.weekday, { color: colors.textTertiary }]}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((iso, i) => {
          if (!iso) return <View key={`e${i}`} style={styles.cell} />;
          const disabled = iso < min;
          const selected = iso === value;
          const isToday = iso === todayISO();
          return (
            <Pressable
              key={iso}
              testID={`${testID}-day-${iso}`}
              disabled={disabled}
              onPress={() => choose(iso)}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected }}
              accessibilityLabel={iso}
              style={styles.cell}
            >
              <View
                style={[
                  styles.dayCircle,
                  selected && { backgroundColor: colors.accent },
                  !selected && isToday && { borderWidth: 1.5, borderColor: colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: selected ? colors.onAccent : disabled ? colors.textTertiary : colors.text },
                    disabled && { opacity: 0.5 },
                    selected && { fontWeight: '800' },
                  ]}
                >
                  {Number(iso.slice(8))}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quick: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthTitle: { fontSize: 17, fontWeight: '700' },
  nav: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15, fontWeight: '500', fontVariant: ['tabular-nums'] },
});
