import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/exercise/ExerciseUI';
import { Screen } from '@/components/ui';
import { ROUTINES } from '@/lib/exercises/routines';
import { DIFFICULTY_LABELS, EQUIPMENT_LABELS } from '@/lib/exercises/types';
import { colors, font, radius } from '@/theme';

const go = (path: string) => router.push(path as Href);

export default function RoutinesScreen() {
  return (
    <Screen>
      <ScreenHeader
        overline="COACHED SESSIONS"
        title="Routines"
        subtitle="Follow along, one exercise at a time. No internet needed."
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/exercises' as Href))}
      />

      <View style={styles.list}>
        {ROUTINES.map((routine, index) => (
          <Pressable
            key={routine.id}
            onPress={() => go(`/routines/${routine.id}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={`${routine.name}, ${routine.durationMin} minutes`}>
            <View style={styles.head}>
              <View style={styles.indexBox}>
                <Text style={styles.indexText}>{String(index + 1).padStart(2, '0')}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title}>{routine.name}</Text>
                <Text style={styles.subtitle}>{routine.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </View>
            <View style={styles.metaRow}>
              <Meta icon="time-outline" label={`${routine.durationMin} min`} />
              <Meta icon="speedometer-outline" label={DIFFICULTY_LABELS[routine.level]} />
              <Meta icon="list-outline" label={`${routine.steps.length} exercises`} />
            </View>
            <Text style={styles.focus}>{routine.focus}</Text>
            <View style={styles.equipRow}>
              {routine.equipment.map((item) => (
                <Text key={item} style={styles.equip}>
                  {EQUIPMENT_LABELS[item]}
                </Text>
              ))}
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function Meta({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={12} color={colors.muted} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: {
    gap: 9,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  indexBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: { color: colors.accent, ...font.mono, fontSize: 11 },
  title: { color: colors.text, fontFamily: 'Archivo-BoldItalic', fontWeight: '700', fontSize: 16 },
  subtitle: { color: colors.muted, fontSize: 11.5 },
  metaRow: { flexDirection: 'row', gap: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.faint, fontSize: 10.5 },
  focus: { color: colors.muted, fontSize: 11.5, lineHeight: 16 },
  equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  equip: {
    color: colors.faint,
    fontSize: 9.5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
});
