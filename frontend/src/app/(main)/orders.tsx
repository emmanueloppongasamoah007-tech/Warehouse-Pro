import { SafeAreaView, Text, View } from "react-native";

export default function OrdersScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-semibold text-slate-900">Orders</Text>
        <Text className="mt-2 text-base text-slate-600">Placeholder screen for the Orders tab.</Text>
      </View>
    </SafeAreaView>
  );
}
