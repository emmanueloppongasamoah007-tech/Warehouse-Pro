import { SafeAreaView, Text, View } from "react-native";

export default function RoutesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-semibold text-slate-900">Routes</Text>
        <Text className="mt-2 text-base text-slate-600">Placeholder screen for the Routes tab.</Text>
      </View>
    </SafeAreaView>
  );
}
