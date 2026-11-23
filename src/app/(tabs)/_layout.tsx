import { Ionicons } from '@expo/vector-icons';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useWorkoutReminders } from '@/lib/reminders';
import { colors, font } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { off: IconName; on: IconName }> = {
  index: { off: 'home-outline', on: 'home' },
  plan: { off: 'list-outline', on: 'list' },
  calendar: { off: 'calendar-outline', on: 'calendar' },
  exercises: { off: 'barbell-outline', on: 'barbell' },
  progress: { off: 'stats-chart-outline', on: 'stats-chart' },
  zones: { off: 'pulse-outline', on: 'pulse' },
};

const ROW_HEIGHT = 62;
const MARKER_W = 18;

/* ---------- One tab ---------- */
function TabItem({
  routeName,
  label,
  focused,
  onPress,
  onLongPress,
}: {
  routeName: string;
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const [anim] = useState(() => new Animated.Value(focused ? 1 : 0));

  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      damping: 16,
      stiffness: 200,
      mass: 0.7,
    }).start();
  }, [focused, anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const icons = ICONS[routeName] ?? ICONS.index;
  const tint = focused ? colors.accent : colors.muted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={focused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
    >
      <Animated.View style={[styles.itemInner, { transform: [{ scale }] }]}>
        <Ionicons name={focused ? icons.on : icons.off} size={22} color={tint} />
        <Text
          numberOfLines={1}
          style={[styles.label, { color: tint }, focused && styles.labelActive]}
        >
          {label.toUpperCase()}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/* ---------- Bar with the sliding lime "pace line" ---------- */
function RunPlanTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(state.index));

  useEffect(() => {
    Animated.spring(position, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 18,
      stiffness: 170,
      mass: 0.8,
    }).start();
  }, [state.index, position]);

  const count = state.routes.length;
  const itemW = rowWidth / count;
  const translateX = position.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => i * itemW + (itemW - MARKER_W) / 2),
  });

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <View
        style={styles.row}
        onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = (options.tabBarAccessibilityLabel ??
            options.title ??
            route.name) as string;

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const onLongPress = () =>
            emitter.emit({ type: 'tabLongPress', target: route.key });

          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              label={label}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}

        {rowWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.marker, { transform: [{ translateX }] }]}
          />
        )}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  useWorkoutReminders();

  return (
    <Tabs
      tabBar={(props) => <RunPlanTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarAccessibilityLabel: 'Calendar' }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ title: 'Exercises', tabBarAccessibilityLabel: 'Exercises' }}
      />
      <Tabs.Screen name="progress" options={{ title: 'Stats' }} />
      <Tabs.Screen name="zones" options={{ title: 'Zones' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  itemInner: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: {
    ...font.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    opacity: 0.75,
  },
  labelActive: { opacity: 1 },
  marker: {
    position: 'absolute',
    bottom: 5,
    left: 0,
    width: MARKER_W,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
