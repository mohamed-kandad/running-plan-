import { Archivo_700Bold_Italic, Archivo_900Black_Italic } from '@expo-google-fonts/archivo';
import { Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import {
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BootSplash } from '@/components/BootSplash';
import { useOnboardingSeen } from '@/lib/onboarding';
import { markSplashSeen, useSplashSeen } from '@/lib/splash';
import { AppProvider } from '@/store/AppStore';
import { colors } from '@/theme';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 300, fade: true });

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
    // Headings use a real italic face: Space Grotesk ships no italic file, so a
    // generated slant never renders consistently across platforms.
    'Archivo-BoldItalic': Archivo_700Bold_Italic,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'ArchivoBlack-Italic': Archivo_900Black_Italic,
    'JetBrainsMono-Medium': JetBrainsMono_500Medium,
    'JetBrainsMono-Bold': JetBrainsMono_700Bold,
  });

  // null while the flag is read from storage, so the native splash stays up.
  const onboardingSeen = useOnboardingSeen();
  const ready = fontsLoaded && onboardingSeen !== null;
  const splashSeen = useSplashSeen();
  const [splashDone, setSplashDone] = useState(false);
  // One boot animation per install. In development it replays on every reload so
  // the animation stays easy to review.
  const showSplash = splashSeen !== null && !splashDone && (__DEV__ || !splashSeen);
  const hideSplash = useCallback(() => {
    setSplashDone(true);
    markSplashSeen();
  }, []);

  // The native splash only has to cover the font load; the animated one takes over
  // from there and holds the screen until the saved plan is in memory.
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.root}>
      {ready ? (
        <SafeAreaProvider>
          <AppProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}>
              {/* First launch only: welcome is reachable, the tabs are not. */}
              <Stack.Protected guard={!onboardingSeen} redirectTo="/">
                <Stack.Screen name="welcome" />
              </Stack.Protected>
              {/* Afterwards the tabs own the app and welcome can never come back. */}
              <Stack.Protected guard={onboardingSeen} redirectTo="/welcome">
                <Stack.Screen name="(tabs)" />
                {/* Reached from the avatar on Home, so it is not a tab. */}
                <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
              </Stack.Protected>
            </Stack>
          </AppProvider>
        </SafeAreaProvider>
      ) : null}
      {showSplash ? <BootSplash ready={ready} onHidden={hideSplash} /> : null}
    </View>
  );
}
