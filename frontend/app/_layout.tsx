import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  return (
    // The auth screens and the tab navigator are siblings in this stack, which
    // is what keeps the tab bar out of onboarding/role-select/signup/signin.
    // Every screen sets its own StatusBar style, so the root default is only a
    // fallback for the brief moment before the first screen mounts.
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="role-select" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
