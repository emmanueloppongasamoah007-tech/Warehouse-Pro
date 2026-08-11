import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    // SafeAreaView MUST come from react-native-safe-area-context. NativeWind v4
    // registers className only on that one; react-native's SafeAreaView is not in
    // the interop registry, so className there is a silent no-op.
    //
    // edges omits the bottom inset because the button below applies its own
    // bottom padding; letting both apply it would double the gap.
    <View className="flex-1 bg-slate-800">
      {/* This screen provides its own full-bleed layout, so the stack header is hidden. */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* style, not className: NativeWind v4 doesn't register expo-image's Image
          in its interop registry, so className would be a silent no-op here. */}
      <Image
        source={require('../assets/images/warehouse-bg.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />

      {/* Dark overlay: keeps the white text readable against the photo. */}
      <View className="absolute inset-0 bg-black/60" />

      {/* Light status bar icons for this dark background. Placed inside the screen
          so it applies on focus and reverts when navigating away. */}
      <StatusBar style="light" />

      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <View className="flex-1 items-center justify-center px-8">
          {/* Logo tile */}
          <View className="h-24 w-24 items-center justify-center rounded-3xl bg-orange-500 shadow-lg">
            <MaterialCommunityIcons name="warehouse" size={52} color="#ffffff" />
          </View>

          <Text className="mt-8 text-center text-4xl font-bold text-white">Warehouse Pro</Text>

          <Text className="mt-2 text-center text-lg font-medium text-orange-400">
            Logistics Management
          </Text>

          <Text className="mt-6 text-center text-base leading-6 text-slate-300">
            Optimize your route, maximize your output.
          </Text>
        </View>

        {/* Bottom action */}
        <View className="px-8 pb-10">
          <Pressable
            onPress={() => router.push('/signup')}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
            className="flex-row items-center justify-center rounded-full bg-orange-500 px-8 py-4 active:bg-orange-600">
            <Text className="text-lg font-semibold text-white">Get Started</Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color="#ffffff"
              style={{ marginLeft: 8 }}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
