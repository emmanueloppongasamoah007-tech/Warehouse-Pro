import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { usePalette } from '@/hooks/use-palette';
import { useThemePreference } from '@/store/use-theme-preference';

export const unstable_settings = {
  anchor: 'index',
};

// Held until the stored theme preference has been read. Without this the app
// paints in the device scheme for a frame and then snaps to the saved one, which
// is very visible when the saved one is dark.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydrated = useThemePreference((state) => state.hydrated);
  const hydrate = useThemePreference((state) => state.hydrate);
  const palette = usePalette();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  // The window behind the navigator, which shows through during screen
  // transitions and over-scroll. Left light it flashes white between dark screens.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.surface).catch(() => {});
  }, [palette.surface]);

  if (!hydrated) return null;

  return (
    // The auth screens and the tab navigator are siblings in this stack, which
    // is what keeps the tab bar out of onboarding/signup/signin.
    // Every screen sets its own StatusBar style, so the root default is only a
    // fallback for the brief moment before the first screen mounts.
    <Stack
      screenOptions={{
        headerShown: false,
        // Matches the screens' own background, so a push does not reveal a
        // white gap behind the incoming screen in dark mode.
        contentStyle: { backgroundColor: palette.surface },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
