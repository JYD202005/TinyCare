/**
 * InlineDatePicker
 * Pure React Native "drum-roll" date picker.
 * No native modules required — works with Expo Go, dev-client, and web fallback.
 *
 * Props:
 *   value   – selected date as "DD/MM/YYYY" string (empty string = no selection)
 *   onChange – called with new "DD/MM/YYYY" string whenever user scrolls a column
 */
import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TC } from './theme';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const ITEM_H = 52;          // height of each row in the wheel
const VISIBLE = 3;           // number of visible rows (must be odd)
const BG = '#FFF9F8';        // matches TC.bg

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Sep', 'Octubre', 'Noviembre', 'Dic',
];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate(); // month is 1-based
}

/* ─── Single scroll column ───────────────────────────────────────────────── */
interface ColProps {
  data: Array<{ label: string; value: number }>;
  selected: number;
  onChange: (v: number) => void;
  flex?: number;
}

function Column({ data, selected, onChange, flex = 1 }: ColProps) {
  const ref = useRef<ScrollView>(null);
  const indexRef = useRef<number>(Math.max(0, data.findIndex(d => d.value === selected)));

  // Scroll to selected item whenever value or data changes
  useEffect(() => {
    const idx = data.findIndex(d => d.value === selected);
    const safe = Math.max(0, idx);
    indexRef.current = safe;
    // Use a short delay so layout is settled before scrolling
    const timer = setTimeout(() => {
      ref.current?.scrollTo({ y: safe * ITEM_H, animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [selected, data.length]);

  const handleEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, data.length - 1));
      if (clamped !== indexRef.current) {
        indexRef.current = clamped;
        onChange(data[clamped].value);
      }
    },
    [data, onChange],
  );

  return (
    <View style={[s.colWrap, { flex }]}>
      <ScrollView
        ref={ref}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
        contentContainerStyle={{ paddingVertical: ITEM_H }}
      >
        {data.map(item => {
          const active = item.value === selected;
          return (
            <View key={item.value} style={s.cell}>
              <Text style={[s.cellText, active && s.cellActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Accent border around the selected (center) row */}
      <View style={s.selectionBar} pointerEvents="none" />

      {/* Gradient fade — top */}
      <LinearGradient
        colors={[BG, 'rgba(255,249,248,0)']}
        style={s.fadeTop}
        pointerEvents="none"
      />
      {/* Gradient fade — bottom */}
      <LinearGradient
        colors={['rgba(255,249,248,0)', BG]}
        style={s.fadeBottom}
        pointerEvents="none"
      />
    </View>
  );
}

/* ─── Public component ───────────────────────────────────────────────────── */
interface InlineDatePickerProps {
  value: string;            // "DD/MM/YYYY" or ""
  onChange: (v: string) => void;
}

export default function InlineDatePicker({ value, onChange }: InlineDatePickerProps) {
  const currentYear = new Date().getFullYear();

  // Parse current value
  const parts  = value?.split('/') ?? [];
  const day    = Math.max(1, parseInt(parts[0] || '1', 10)  || 1);
  const month  = Math.max(1, parseInt(parts[1] || '1', 10)  || 1);
  const year   = parseInt(parts[2] || String(currentYear), 10) || currentYear;

  const maxDay  = daysInMonth(month, year);
  const safeDay = Math.min(day, maxDay);

  const emit = (d: number, m: number, y: number) => {
    onChange(`${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`);
  };

  // Build column data
  const days = Array.from({ length: maxDay }, (_, i) => ({
    label: String(i + 1).padStart(2, '0'),
    value: i + 1,
  }));

  const months = MONTHS_ES.map((label, i) => ({ label, value: i + 1 }));

  // Years: current year → current year - 10
  const years = Array.from({ length: 11 }, (_, i) => {
    const y = currentYear - i;
    return { label: String(y), value: y };
  });

  return (
    <View style={s.root}>
      {/* Column headers */}
      <View style={s.headers}>
        <Text style={[s.headerText, { flex: 1 }]}>DÍA</Text>
        <Text style={[s.headerText, { flex: 2 }]}>MES</Text>
        <Text style={[s.headerText, { flex: 1.5 }]}>AÑO</Text>
      </View>

      {/* Scroll columns */}
      <View style={s.row}>
        <Column
          data={days}
          selected={safeDay}
          onChange={d => emit(d, month, year)}
          flex={1}
        />
        <View style={s.divider} />
        <Column
          data={months}
          selected={month}
          onChange={m => {
            const max = daysInMonth(m, year);
            emit(Math.min(safeDay, max), m, year);
          }}
          flex={2}
        />
        <View style={s.divider} />
        <Column
          data={years}
          selected={year}
          onChange={y => {
            const max = daysInMonth(month, y);
            emit(Math.min(safeDay, max), month, y);
          }}
          flex={1.5}
        />
      </View>

      {/* Friendly date preview */}
      {value ? (
        <View style={s.preview}>
          <Text style={s.previewText}>
            📅 {safeDay} de {MONTHS_ES[month - 1]} de {year}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: {
    backgroundColor: BG,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: TC.inputBorder,
    overflow: 'hidden',
    marginBottom: 16,
  },
  headers: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: TC.inputBorder,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '800',
    color: TC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  divider: {
    width: 1,
    height: ITEM_H * (VISIBLE - 1),
    backgroundColor: TC.inputBorder,
  },
  colWrap: {
    height: ITEM_H * VISIBLE,
    overflow: 'hidden',
  },
  cell: {
    height: ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 14,
    color: TC.textMuted,
    fontWeight: '400',
  },
  cellActive: {
    fontSize: 20,
    color: TC.textDark,
    fontWeight: '800',
  },
  selectionBar: {
    position: 'absolute',
    top: ITEM_H,
    left: 0,
    right: 0,
    height: ITEM_H,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: TC.accent,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_H,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_H,
  },
  preview: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: TC.inputBorder,
    alignItems: 'center',
    backgroundColor: TC.accentLight,
  },
  previewText: {
    fontSize: 13,
    color: TC.textBody,
    fontWeight: '700',
  },
});
