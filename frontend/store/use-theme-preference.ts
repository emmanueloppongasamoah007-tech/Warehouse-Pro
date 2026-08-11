import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { create } from 'zustand';

/**
 * What the user picked in Settings - not the scheme currently on screen.
 *
 * 'system' resolves to light or dark at render time, so the two are genuinely
 * different values: someone on 'system' at night is looking at a dark app while
 * their preference is still 'system'.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'warehousepro.theme-preference';

/** Narrows whatever came back from storage; anything unexpected reads as 'system'. */
function parsePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

type ThemePreferenceState = {
  preference: ThemePreference;
  /** False until storage has been read. The root layout holds the splash on it. */
  hydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
  hydrate: () => Promise<void>;
};

/**
 * Theme preference, persisted across launches.
 *
 * NativeWind holds the active scheme in memory only - `colorScheme.set()` drives
 * React Native's Appearance API and is gone on the next cold start. Persisting
 * it is on us, so this store is the durable half and NativeWind is the live half.
 *
 * AsyncStorage rather than expo-secure-store: a display preference is not a
 * secret, and secure-store is reserved for the auth token.
 */
export const useThemePreference = create<ThemePreferenceState>((set) => ({
  preference: 'system',
  hydrated: false,

  setPreference: (preference) => {
    set({ preference });
    // Applied before the write so the UI flips on tap rather than after a
    // round trip to disk.
    colorScheme.set(preference);
    // Fire-and-forget: a failed write costs the preference on next launch,
    // which is not worth blocking the toggle or surfacing an error for.
    AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {});
  },

  hydrate: async () => {
    try {
      const stored = parsePreference(await AsyncStorage.getItem(STORAGE_KEY));
      set({ preference: stored });
      colorScheme.set(stored);
    } catch {
      // Unreadable storage is not fatal - fall back to following the device.
      colorScheme.set('system');
    } finally {
      // Always flips, so a storage failure cannot leave the app stuck on splash.
      set({ hydrated: true });
    }
  },
}));
