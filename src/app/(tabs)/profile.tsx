import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Pill, Screen, SectionTitle } from '@/components/ui';
import { saveUserName, useUserName } from '@/lib/userName';
import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';

export default function ProfileScreen() {
  const { runs, completedIds, clearAllData } = useApp();
  const storedName = useUserName();
  const [draft, setDraft] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [cleared, setCleared] = useState(false);

  const name = draft ?? storedName;
  const cleanName = name.trim();
  const canSave = cleanName.length > 0 && cleanName !== storedName.trim();

  const save = () => {
    if (!canSave) return;
    void saveUserName(cleanName).then(() => {
      setDraft(null);
      setJustSaved(true);
      setCleared(false);
    });
  };

  const confirmClear = () => {
    Alert.alert(
      'Clear all data?',
      'This erases your plan, every workout, all logged runs, your session progress and heart-rate zones. Your name is kept. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all data',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            setDraft('');
            setJustSaved(false);
            setCleared(true);
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.overline}>ACCOUNT</Text>
        <Text style={styles.title}>Profile</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.rowTitle}>Your name</Text>
        <Text style={styles.hint}>Used to greet you when you open the app.</Text>
        <TextInput
          value={name}
          onChangeText={(next) => {
            setDraft(next);
            setJustSaved(false);
            setCleared(false);
          }}
          placeholder="Your name"
          placeholderTextColor={colors.faint}
          style={styles.input}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={24}
          returnKeyType="done"
          onSubmitEditing={save}
          selectionColor={colors.accent}
          accessibilityLabel="Your name"
        />
        <Button label="Save name" onPress={save} disabled={!canSave} />
        {justSaved && !canSave ? <Text style={styles.saved}>Name saved.</Text> : null}
      </Card>

      <SectionTitle title="YOUR DATA" />

      <Card style={styles.card}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completedIds.size}</Text>
            <Text style={styles.statLabel}>SESSIONS DONE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{runs.length}</Text>
            <Text style={styles.statLabel}>RUNS LOGGED</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.dangerCard}>
        <Pill label="Danger zone" color={colors.orange} />
        <Text style={styles.hint}>
          Erase your plan, every workout, all runs and heart-rate zones. Your app goes back to
          being completely empty.
        </Text>
        <Button
          label="Clear all data"
          variant="secondary"
          icon="trash-outline"
          onPress={confirmClear}
        />
        {cleared ? (
          <View style={styles.clearedRow}>
            <Ionicons name="checkmark-circle" size={15} color={colors.green} />
            <Text style={styles.clearedText}>All data cleared. Your app is empty again.</Text>
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

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
  card: { gap: 10 },
  dangerCard: { gap: 12 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.faint, fontSize: 11.5, lineHeight: 17 },
  input: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontSize: 22,
    letterSpacing: -0.4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  saved: { color: colors.green, fontSize: 12, fontWeight: '600' },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  statValue: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  statLabel: { color: colors.muted, ...font.label, fontSize: 10 },
  clearedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clearedText: { flex: 1, color: colors.muted, fontSize: 11.5, lineHeight: 16 },
});
