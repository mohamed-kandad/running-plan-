import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { Platform, StyleSheet, type ColorValue } from 'react-native';

import { useWorkoutReminders } from '@/lib/reminders';
import { colors } from '@/theme';

type TabIconProps = { color: ColorValue | null; focused: boolean; size: number };

const iconFor = (
  name: keyof typeof Ionicons.glyphMap,
  focusedName: keyof typeof Ionicons.glyphMap
) =>
  function TabIcon({ color, focused, size }: TabIconProps) {
    return (
      <Ionicons
        name={focused ? focusedName : name}
        size={size ?? 22}
        color={(color ?? colors.text) as string}
      />
    );
  };

export default function TabsLayout() {
  useWorkoutReminders();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: iconFor('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: 'Plan', tabBarIcon: iconFor('list-outline', 'list') }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: iconFor('calendar-outline', 'calendar') }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Stats', tabBarIcon: iconFor('stats-chart-outline', 'stats-chart') }}
      />
      <Tabs.Screen
        name="zones"
        options={{ title: 'Zones', tabBarIcon: iconFor('pulse-outline', 'pulse') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: iconFor('person-outline', 'person') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 76,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
  },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  item: { paddingVertical: 2 },
});
