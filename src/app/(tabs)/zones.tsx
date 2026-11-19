import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Pill, Screen, SectionTitle, Stepper } from '@/components/ui';
import { ZONE_META } from '@/lib/zones';
import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';

export default function ZonesScreen() {
  const { zones, maxHr, restingHr, setMaxHr, setRestingHr, adjustZoneEdge, resetZones } = useApp();
  const [expanded, setExpanded] = useState<number | null>(2);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.overline}>HEART RATE</Text>
        <Text style={styles.title}>Zones</Text>
      </View>

      <Card style={styles.hrCard}>
        <View style={styles.hrRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.rowTitle}>Max heart rate</Text>
            <Text style={styles.hint}>
              Auto-set to 220 − age if you are unsure. Zones recalculate when you change it.
            </Text>
          </View>
          <Stepper value={maxHr} onChange={setMaxHr} step={1} min={120} max={220} suffix=" bpm" />
        </View>
        <View style={styles.divider} />
        <View style={styles.hrRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.rowTitle}>Resting heart rate</Text>
            <Text style={styles.hint}>Measured first thing in the morning, lying down.</Text>
          </View>
          <Stepper
            value={restingHr}
            onChange={setRestingHr}
            step={1}
            min={30}
            max={110}
            suffix=" bpm"
          />
        </View>
      </Card>

      <SectionTitle
        title="YOUR FIVE ZONES"
        action={
          <Pressable onPress={resetZones} hitSlop={8}>
            <Text style={styles.link}>Reset</Text>
          </Pressable>
        }
      />

      <View style={styles.list}>
        {zones.map((zone, index) => {
          const meta = ZONE_META[index];
          const open = expanded === zone.id;
          return (
            <Pressable
              key={zone.id}
              onPress={() => setExpanded(open ? null : zone.id)}
              style={[styles.zoneCard, open && { borderColor: `${meta.color}66` }]}
            >
              <View style={styles.zoneHeader}>
                <View style={[styles.zoneSwatch, { backgroundColor: `${meta.color}22` }]}>
                  <Text style={[styles.zoneSwatchText, { color: meta.color }]}>{meta.short}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.zoneName}>{meta.name}</Text>
                  <Text style={styles.zoneRange}>
                    {zone.min}–{zone.max} bpm
                  </Text>
                </View>
                <View style={styles.zoneRight}>
                  <Text style={[styles.zonePct, { color: meta.color }]}>
                    {Math.round((zone.min / maxHr) * 100)}–{Math.round((zone.max / maxHr) * 100)}%
                  </Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={colors.faint}
                  />
                </View>
              </View>

              <View style={styles.rangeTrack}>
                <View
                  style={[
                    styles.rangeFill,
                    {
                      backgroundColor: meta.color,
                      left: `${rangeLeft(zone.min, maxHr)}%`,
                      width: `${rangeWidth(zone.min, zone.max, maxHr)}%`,
                    },
                  ]}
                />
              </View>

              {open ? (
                <View style={styles.expanded}>
                  <Text style={styles.feel}>{meta.feel}</Text>
                  <Text style={styles.purpose}>{meta.purpose}</Text>
                  <View style={styles.edgeRow}>
                    <View style={styles.edgeGroup}>
                      <Text style={styles.edgeLabel}>LOW</Text>
                      <Stepper
                        value={zone.min}
                        onChange={(next) => adjustZoneEdge(zone.id, 'min', next - zone.min)}
                        step={5}
                        min={30}
                        max={230}
                      />
                    </View>
                    <View style={styles.edgeGroup}>
                      <Text style={styles.edgeLabel}>HIGH</Text>
                      <Stepper
                        value={zone.max}
                        onChange={(next) => adjustZoneEdge(zone.id, 'max', next - zone.max)}
                        step={5}
                        min={30}
                        max={230}
                      />
                    </View>
                  </View>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.tipCard}>
        <Pill label="How to use it" color={colors.blue} />
        <Text style={styles.tipText}>
          Run easy sessions by effort first, then check the number. If your easy pace keeps you in
          Z3, slow down — most of your week should sit in Z2.
        </Text>
        <Button label="Recalculate from max HR" variant="secondary" onPress={resetZones} />
      </Card>
    </Screen>
  );
}

const HR_FLOOR = 80;
const hrCeiling = (maxHr: number) => maxHr + 10;
const rangeLeft = (min: number, maxHr: number) =>
  clamp(((min - HR_FLOOR) / (hrCeiling(maxHr) - HR_FLOOR)) * 100);
const rangeWidth = (min: number, max: number, maxHr: number) =>
  Math.max(3, clamp(((max - min) / (hrCeiling(maxHr) - HR_FLOOR)) * 100));
const clamp = (value: number) => Math.min(100, Math.max(0, value));

const styles = StyleSheet.create({
  header: { paddingTop: 8, gap: 4 },
  overline: {
    color: colors.muted,
    ...font.label,
    fontSize: 11,
  },
  title: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  hrCard: { gap: 14 },
  hrRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.faint, fontSize: 11.5, lineHeight: 17 },
  divider: { height: 1, backgroundColor: colors.border },
  link: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  list: { gap: 10 },
  zoneCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneSwatch: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneSwatchText: { fontSize: 13, fontWeight: '800' },
  zoneName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  zoneRange: { color: colors.muted, fontSize: 12.5 },
  zoneRight: { alignItems: 'flex-end', gap: 4 },
  zonePct: { fontSize: 12, fontWeight: '700' },
  rangeTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  rangeFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 2,
    opacity: 0.8,
  },
  expanded: { gap: 8, paddingTop: 4 },
  feel: { color: colors.text, fontSize: 13, lineHeight: 19 },
  purpose: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  edgeRow: { flexDirection: 'row', gap: 12, paddingTop: 4 },
  edgeGroup: { flex: 1, gap: 6 },
  edgeLabel: { color: colors.faint, ...font.label, fontSize: 10 },
  tipCard: { gap: 10 },
  tipText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
});
