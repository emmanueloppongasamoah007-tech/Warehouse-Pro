import "../../global.css";
import { Stack } from "expo-router";
import { View, Text } from "react-native";
import useLoadFonts from "@/hooks/useLoadFonts";

export default function RootLayout() {
  const fontsLoaded = useLoadFonts();

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-100">
        <Text className="text-neutral-500">Loading fonts…</Text>
      </View>
    );
  }

  return <Stack />;
}
