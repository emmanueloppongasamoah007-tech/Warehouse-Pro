import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRoleStore, type Role } from '@/store/use-role-store';

type RoleOption = {
  value: Role;
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'picker',
    label: 'Picker',
    description: 'Pick and pack orders',
    icon: 'cart-outline',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Manage inventory and routes',
    icon: 'clipboard-list-outline',
  },
];

export default function RoleSelectScreen() {
  const router = useRouter();
  // Selecting individually rather than destructuring the whole store keeps this
  // from re-rendering on unrelated state added to the store later.
  const role = useRoleStore((state) => state.role);
  const setRole = useRoleStore((state) => state.setRole);

  const canContinue = role !== null;

  return (
    // Matches onboarding: dark slate base, orange accent, light status bar.
    // SafeAreaView must come from react-native-safe-area-context - NativeWind v4
    // registers className on that one only.
    <View className="flex-1 bg-slate-900">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <View className="flex-1 px-8 pt-12">
          <Text className="text-3xl font-bold text-white">Choose your role</Text>
          <Text className="mt-2 text-base text-slate-400">
            This tailors the app to how you work. You can change it later.
          </Text>

          <View className="mt-10 gap-4">
            {ROLE_OPTIONS.map((option) => {
              const isSelected = role === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setRole(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${option.label}. ${option.description}`}
                  className={`flex-row items-center rounded-2xl border-2 p-5 ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-slate-700 bg-slate-800 active:bg-slate-700'
                  }`}>
                  <View
                    className={`h-14 w-14 items-center justify-center rounded-xl ${
                      isSelected ? 'bg-orange-500' : 'bg-slate-700'
                    }`}>
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={30}
                      // Icons are not in NativeWind's interop registry, so color
                      // is passed as a prop rather than a className.
                      color={isSelected ? '#ffffff' : '#94a3b8'}
                    />
                  </View>

                  <View className="ml-4 flex-1">
                    <Text
                      className={`text-lg font-semibold ${
                        isSelected ? 'text-orange-400' : 'text-white'
                      }`}>
                      {option.label}
                    </Text>
                    <Text className="mt-0.5 text-sm text-slate-400">{option.description}</Text>
                  </View>

                  {/* Radio indicator */}
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                      isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-600'
                    }`}>
                    {isSelected ? (
                      <MaterialCommunityIcons name="check" size={16} color="#ffffff" />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="px-8 pb-10">
          <Pressable
            onPress={() => router.push('/signup')}
            disabled={!canContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !canContinue }}
            className={`flex-row items-center justify-center rounded-full px-8 py-4 ${
              canContinue ? 'bg-orange-500 active:bg-orange-600' : 'bg-slate-700'
            }`}>
            <Text
              className={`text-lg font-semibold ${
                canContinue ? 'text-white' : 'text-slate-500'
              }`}>
              Continue
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
