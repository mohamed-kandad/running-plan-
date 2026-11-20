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
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useOnboardingSeen } from '@/lib/onboarding';
import { AppProvider } from '@/store/AppStore';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

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

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
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
  );
}
