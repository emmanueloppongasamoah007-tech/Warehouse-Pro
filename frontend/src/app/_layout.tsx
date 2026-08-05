import "../../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { View, Text } from "react-native";
import * as Linking from "expo-linking";
import useLoadFonts from "@/hooks/useLoadFonts";
import { supabase } from "@/lib/supabase";
import { useDevAuthStore } from "@/store/devAuthStore";

export default function RootLayout() {
  const fontsLoaded = useLoadFonts();
  const router = useRouter();
  const segments = useSegments();
  const isDevMode = useDevAuthStore((state) => state.isDevMode);

  useEffect(() => {
    // Check initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const inAuthGroup = segments[0] === "(auth)";
      if ((session || isDevMode) && inAuthGroup) {
        router.replace("/");
      } else if (!session && !isDevMode && !inAuthGroup && segments[0] !== "onboarding") {
        router.replace("/onboarding");
      }
    });

    // Subscribe to future auth state changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          router.replace("/");
        } else if (!isDevMode) {
          router.replace("/onboarding");
        }
      }
    );

    // Handle deep links from Supabase auth redirects (e.g., magic links, OAuth)
    const urlEventListener = Linking.addEventListener("url", ({ url }) => {
      // Supabase automatically processes the auth URL through onAuthStateChange
      // because detectSessionInUrl is enabled in supabase.ts
    });

    return () => {
      subscription.unsubscribe();
      urlEventListener.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDevMode]);

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-100">
        <Text className="text-neutral-500">Loading fonts…</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
