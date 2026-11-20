import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';

export function Screen({ children }: { children: React.ReactNode }) {
  const { lastSavedRun, undoLastRun, dismissUndoToast } = useApp();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {lastSavedRun ? (
        <View style={styles.undoToast}>
          <View style={styles.undoToastContent}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <View style={{ flex: 1 }}>
              <Text style={styles.undoToastTitle} numberOfLines={1}>
                Saved: {lastSavedRun.title}
              </Text>
              <Text style={styles.undoToastSub}>
                {lastSavedRun.distanceKm} km completed
              </Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
                undoLastRun();
              }}
              style={styles.undoButton}
            >
              <Text style={styles.undoButtonText}>Undo</Text>
            </Pressable>
            <Pressable
              onPress={dismissUndoToast}
              style={styles.dismissButton}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionText}>{title}</Text>
      {action}
    </View>
  );
}

export function Pill({
  label,
  color = colors.muted,
  filled = false,
}: {
  label: string;
  color?: string;
  filled?: boolean;
}) {
  return (
    <View
      style={[
        styles.pill,
        filled
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: `${color}1A`, borderColor: `${color}55` },
      ]}
    >
      <Text style={[styles.pillText, { color: filled ? colors.accentInk : color }]}>{label}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  const tap = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    onPress();
  };

  return (
    <Pressable
      onPress={tap}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.8 },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={17}
          color={variant === 'primary' ? colors.accentInk : colors.text}
        />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          variant === 'primary' ? styles.buttonTextPrimary : styles.buttonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Stat({
  value,
  label,
  unit,
  accent,
}: {
  value: string;
  label: string;
  unit?: string;
  accent?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statRow}>
        <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  step = 5,
  min = 30,
  max = 230,
  suffix,
}: {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const nudge = (direction: number) => {
    const next = Math.min(max, Math.max(min, value + direction * step));
    Haptics.selectionAsync().catch(() => { });
    onChange(next);
  };

  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => nudge(-1)} style={styles.stepperButton} hitSlop={8}>
        <Ionicons name="remove" size={16} color={colors.text} />
      </Pressable>
      <Text style={styles.stepperValue}>
        {value}
        {suffix ? <Text style={styles.stepperSuffix}>{suffix}</Text> : null}
      </Text>
      <Pressable onPress={() => nudge(1)} style={styles.stepperButton} hitSlop={8}>
        <Ionicons name="add" size={16} color={colors.text} />
      </Pressable>
    </View>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => {
              Haptics.selectionAsync().catch(() => { });
              onChange(option.value);
            }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

/**
 * 45° diagonal stripe overlay. Rendered as a row of skewed hairlines inside a
 * clipping parent — the same effect as CSS
 * `repeating-linear-gradient(45deg, … 0 1px, transparent 1px 14px)`.
 */
export function DiagonalStripes({ opacity = 1 }: { opacity?: number }) {
  const lines = React.useMemo(() => Array.from({ length: 40 }, (_, i) => i), []);
  return (
    <View pointerEvents="none" style={[styles.stripes, { opacity }]}>
      {lines.map((i) => (
        <View key={i} style={[styles.stripe, { left: i * 14 - 200 }]} />
      ))}
    </View>
  );
}

/** Lime hero CTA card with diagonal stripes and a dark circular play button. */
export function HeroCTA({
  label,
  title,
  meta,
  icon = 'play',
  onPress,
}: {
  label: string;
  title: string;
  meta?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
        onPress();
      }}
      style={({ pressed }) => [styles.heroCta, pressed && { opacity: 0.92 }]}
    >
      <DiagonalStripes />
      <View style={styles.heroCtaContent}>
        <Text style={styles.heroCtaLabel}>{label}</Text>
        <Text style={styles.heroCtaTitle} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        {meta ? <Text style={styles.heroCtaMeta}>{meta}</Text> : null}
      </View>
      <View style={styles.heroCtaButton}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
    </Pressable>
  );
}

export interface BarDatum {
  key: string;
  value: number;
  label: string;
  highlight?: boolean;
}

/** Bar chart: muted bars, highlighted bar in lime with a soft glow. */
export function BarChart({ data, height = 112 }: { data: BarDatum[]; height?: number }) {
  const peak = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={styles.chart}>
      {data.map((datum) => {
        const barHeight = Math.max(datum.value > 0 ? 4 : 2, Math.round((datum.value / peak) * height));
        return (
          <View key={datum.key} style={styles.barColumn}>
            <Text style={[styles.barValue, datum.highlight && { color: colors.accent }]}>
              {datum.value > 0 ? Math.round(datum.value) : ''}
            </Text>
            <View style={[styles.barTrack, { height }]}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: datum.highlight ? colors.accent : colors.surfaceAlt,
                  },
                  datum.highlight && styles.barGlow,
                ]}
              />
            </View>
            <Text style={[styles.barLabel, datum.highlight && { color: colors.text }]}>
              {datum.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Small lime badge — "NEW PERSONAL BEST"-style pill. */
export function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: 20,
    // Clears the floating glass tab bar.
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -4,
  },
  sectionText: {
    color: colors.muted,
    ...font.label,
    fontFamily: 'Archivo-BoldItalic',
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    height: 56,
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonGhost: { paddingVertical: 10, height: 'auto' as unknown as number },
  buttonText: { fontSize: 15, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  buttonTextPrimary: { color: colors.accentInk },
  buttonTextSecondary: { color: colors.text },
  stat: { flex: 1, gap: 4 },
  statLabel: { color: colors.muted, ...font.label, fontSize: 11 },
  statValue: { color: colors.text, fontFamily: 'SpaceGrotesk-Bold', fontWeight: '700', fontSize: 28, letterSpacing: -0.5 },
  statUnit: { color: colors.muted, fontFamily: 'SpaceGrotesk-Bold', fontSize: 14, fontWeight: '700' },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 4,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepperValue: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    fontSize: 15,
    minWidth: 46,
    textAlign: 'center',
  },
  stepperSuffix: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  segmentActive: { backgroundColor: colors.accent },
  segmentText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: colors.accentInk, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border },
  undoToast: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    padding: 12,
  },
  undoToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  undoToastTitle: {
    color: colors.text,
    ...font.small,
    fontWeight: '700',
  },
  undoToastSub: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  undoButton: {
    backgroundColor: `${colors.accent}18`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
  },
  undoButtonText: {
    color: colors.accent,
    ...font.tiny,
    fontSize: 12,
  },
  dismissButton: {
    padding: 4,
  },

  /* diagonal stripes overlay */
  stripes: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    top: -200,
    bottom: -200,
    width: 1,
    backgroundColor: 'rgba(13,15,18,0.14)',
    transform: [{ rotate: '45deg' }],
  },

  /* hero CTA */
  heroCta: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: 18,
    minHeight: 132,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroCtaContent: { flex: 1, gap: 4 },
  heroCtaLabel: {
    color: 'rgba(13,15,18,0.55)',
    ...font.label,
    fontWeight: '700',
  },
  heroCtaTitle: {
    color: colors.accentInk,
    ...font.heroTitleSm,
    fontSize: 30,
  },
  heroCtaMeta: { color: 'rgba(13,15,18,0.65)', ...font.tiny },
  heroCtaButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accentInk,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* bar chart */
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  barColumn: { flex: 1, alignItems: 'center', gap: 6 },
  barValue: { color: colors.muted, ...font.mono, fontSize: 10 },
  barTrack: { width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '60%', maxWidth: 26, borderRadius: 6, backgroundColor: colors.surfaceAlt },
  barGlow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  barLabel: { color: colors.faint, ...font.mono },

  /* badge */
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: {
    color: colors.accentInk,
    ...font.monoBold,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
