import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Read as static `process.env.X` member expressions. Expo's Babel plugin inlines
// EXPO_PUBLIC_* vars at build time by matching this exact shape; computed access
// such as process.env[name] is not inlined and resolves to undefined in the bundle.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in frontend/.env, then restart Metro ' +
      'with `npx expo start -c` so the new values are inlined into the bundle.',
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // Without an explicit adapter the client reaches for localStorage, which does
    // not exist on native, and silently falls back to in-memory storage. Sessions
    // would then vanish on every app restart.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Native apps have no URL to read an auth callback from.
    detectSessionInUrl: false,
  },
});
