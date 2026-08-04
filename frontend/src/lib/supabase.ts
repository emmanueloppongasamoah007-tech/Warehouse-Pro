import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

const resolveEnv = (name: string) => {
  return (
    process.env[name] ??
    (Constants.expoConfig?.extra as Record<string, string> | undefined)?.[name] ??
    undefined
  );
};

const supabaseUrl = resolveEnv("EXPO_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = resolveEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
  );
}

const secureStorage = {
  async getItem(key: string) {
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
