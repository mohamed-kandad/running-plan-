import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font } from '@/theme';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const MAX_BOARD = 520;
const BOARD_PAD = 12;

/**
 * Stride's own keypad for the race bib. The welcome screen never opens the phone
 * keyboard, so the name is typed on a flat, race-timing style board that matches
 * the rest of the app: dark keycaps, one lime action key.
 */
export function NameKeyboard({
  value,
  onChangeText,
  onClose,
  maxLength = 18,
}: {
  value: string;
  onChangeText: (next: string) => void;
  onClose: () => void;
  maxLength?: number;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [shift, setShift] = useState(true);

  // Ten keycaps per row, so the board narrows with the phone instead of wrapping.
  const boardWidth = Math.min(width, MAX_BOARD) - BOARD_PAD * 2;
  const keySize = Math.max(26, Math.min(42, (boardWidth - 9 * 5) / 10));

  const tap = (letter: string) => {
    if (value.length >= maxLength) return;
    void Haptics.selectionAsync().catch(() => {});
    onChangeText(value + (shift ? letter.toUpperCase() : letter));
    // A name starts with a capital; dropping shift after one letter keeps it fast.
    if (shift) setShift(false);
  };

  const backspace = () => {
    if (!value) return;
    void Haptics.selectionAsync().catch(() => {});
    onChangeText(value.slice(0, -1));
  };

  const space = () => {
    if (value.length >= maxLength) return;
    void Haptics.selectionAsync().catch(() => {});
    onChangeText(`${value} `);
  };

  return (
    <View
      style={[
        styles.board,
        { paddingBottom: Math.max(insets.bottom, 8) + 8 },
      ]}>
      <View style={styles.head}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={styles.headButton}
          accessibilityRole="button"
          accessibilityLabel="Close keyboard">
          <Ionicons name="chevron-down" size={17} color={colors.muted} />
        </Pressable>
        <Text style={styles.headLabel}>STRIDE KEYPAD</Text>
        <View style={styles.headRule} />
        <Text style={styles.headCount}>
          {value.length}/{maxLength}
        </Text>
      </View>

      {ROWS.map((row, rowIndex) => (
        <View key={row} style={styles.row}>
          {rowIndex === 1 ? <View style={styles.rowInset} /> : null}
          {row.split('').map((letter) => (
            <Pressable
              key={letter}
              onPress={() => tap(letter)}
              style={({ pressed }) => [
                styles.key,
                { width: keySize },
                pressed && styles.keyPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={shift ? letter.toUpperCase() : letter}>
              <Text style={styles.keyText}>{shift ? letter.toUpperCase() : letter}</Text>
            </Pressable>
          ))}
          {/* Delete sits right of M, where the thumb already is. */}
          {rowIndex === ROWS.length - 1 ? (
            <Pressable
              onPress={backspace}
              style={({ pressed }) => [styles.key, styles.keyWide, pressed && styles.keyPressed]}
              accessibilityRole="button"
              accessibilityLabel="Delete">
              <Ionicons name="backspace-outline" size={19} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      ))}

      <View style={styles.row}>
        <Pressable
          onPress={() => setShift((on) => !on)}
          style={({ pressed }) => [
            styles.key,
            styles.keyWide,
            shift && styles.keyOn,
            pressed && styles.keyPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Shift">
          <Ionicons name="arrow-up" size={18} color={shift ? colors.accentInk : colors.muted} />
        </Pressable>

        <Pressable
          onPress={space}
          style={({ pressed }) => [styles.key, styles.keySpace, pressed && styles.keyPressed]}
          accessibilityRole="button"
          accessibilityLabel="Space">
          <Text style={styles.spaceText}>SPACE</Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.key, styles.keyGo, pressed && styles.keyPressed]}
          accessibilityRole="button"
          accessibilityLabel="Done">
          <Text style={styles.goText}>GO</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: '#131510',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: BOARD_PAD,
    paddingTop: 10,
    gap: 6,
    overflow: 'visible',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  headButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headLabel: { color: colors.muted, ...font.mono, fontSize: 9, letterSpacing: 2.2 },
  headRule: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  headCount: { color: colors.accent, ...font.mono, fontSize: 9, letterSpacing: 1.4 },

  row: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  rowInset: { width: 9 },

  key: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1F2319',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: '#2F3624', borderColor: 'rgba(212,255,0,0.22)' },
  keyText: { color: colors.text, fontFamily: 'SpaceGrotesk-Bold', fontSize: 17 },
  keyWide: { width: 56 },
  keySpace: { flex: 1, maxWidth: 220 },
  keyOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  keyGo: { width: 72, backgroundColor: colors.accent, borderColor: colors.accent },
  goText: { color: colors.accentInk, fontFamily: 'SpaceGrotesk-Bold', fontSize: 14, letterSpacing: 1.4 },
  spaceText: { color: colors.muted, ...font.mono, fontSize: 9, letterSpacing: 2.6 },
});
