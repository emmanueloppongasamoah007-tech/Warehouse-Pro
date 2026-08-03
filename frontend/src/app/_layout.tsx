import "../../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { View, Text } from "react-native";
import useLoadFonts from "@/hooks/useLoadFonts";
import { supabase } from "@/lib/supabase";

export default function RootLayout() {
  const fontsLoaded = useLoadFonts();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Check initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const inAuthGroup = segments[0] === "(auth)";
      if (session && inAuthGroup) {
        router.replace("/");
      } else if (!session && !inAuthGroup && segments[0] !== "onboarding") {
        router.replace("/onboarding");
      }
    });

    // Subscribe to future auth state changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          router.replace("/");
        } else {
          router.replace("/onboarding");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
