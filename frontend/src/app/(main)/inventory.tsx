import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { inventoryItems } from "@/data/inventory";
import { images } from "@/constants/images";
import type { InventoryItem, InventoryStatus } from "@/types/inventory";

type InventoryFilter = "all" | InventoryStatus;

const filterOptions: { label: string; value: InventoryFilter }[] = [
  { label: "All", value: "all" },
  { label: "Healthy", value: "healthy" },
  { label: "Low", value: "low" },
  { label: "Critical", value: "critical" },
];

function getStatusLabel(status: InventoryStatus) {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "low":
      return "Low";
    case "critical":
      return "Critical";
  }
}

function getStatusClasses(status: InventoryStatus) {
  switch (status) {
    case "healthy":
      return "bg-emerald-100 text-emerald-700";
    case "low":
      return "bg-amber-100 text-amber-700";
    case "critical":
      return "bg-rose-100 text-rose-700";
  }
}

function getProgressWidth(item: InventoryItem) {
  const ratio = item.stock / item.target;
  return Math.min(Math.max(ratio * 100, 8), 100);
}

export default function InventoryScreen() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<InventoryFilter>("all");

  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesFilter = activeFilter === "all" || item.status === activeFilter;
      const query = search.trim().toLowerCase();
      const matchesQuery =
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, search]);

  const summary = useMemo(() => {
    const criticalCount = inventoryItems.filter((item) => item.status === "critical").length;
    const lowCount = inventoryItems.filter((item) => item.status === "low").length;
    const healthyCount = inventoryItems.filter((item) => item.status === "healthy").length;

    return {
      criticalCount,
      lowCount,
      healthyCount,
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-5 pt-6">
          <Text className="text-3xl font-semibold text-slate-900">Inventory</Text>
          <Text className="mt-2 text-sm text-slate-500">
            Monitor bin stock and fast-moving items from one view.
          </Text>
        </View>

        <View className="mx-5 mt-6 overflow-hidden rounded-[28px] bg-slate-900">
          <Image source={images.warehouse} className="h-36 w-full opacity-70" />
          <View className="absolute inset-0 bg-slate-900/70" />
          <View className="absolute inset-0 justify-between p-5">
            <View>
              <Text className="text-sm uppercase tracking-[0.3em] text-slate-300">
                Warehouse overview
              </Text>
              <Text className="mt-2 text-2xl font-semibold text-white">
                5 active SKUs tracking
              </Text>
            </View>
            <View className="flex-row items-center justify-between rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
              <View>
                <Text className="text-sm text-slate-300">Need attention</Text>
                <Text className="mt-1 text-xl font-semibold text-white">
                  {summary.criticalCount + summary.lowCount} items
                </Text>
              </View>
              <View className="rounded-full bg-orange-500 px-3 py-2">
                <Text className="text-sm font-semibold text-white">Reorder soon</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mx-5 mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-slate-900">Stock health</Text>
              <Text className="mt-1 text-sm text-slate-500">
                {summary.healthyCount} healthy · {summary.lowCount} low · {summary.criticalCount} critical
              </Text>
            </View>
            <View className="rounded-full bg-slate-100 px-3 py-2">
              <Text className="text-sm font-semibold text-slate-700">Live</Text>
            </View>
          </View>
        </View>

        <View className="mx-5 mt-5">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search item, bin, or location"
            placeholderTextColor="#94a3b8"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
            <View className="flex-row gap-2">
              {filterOptions.map((option) => {
                const isActive = activeFilter === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setActiveFilter(option.value)}
                    className={`rounded-full px-4 py-2 ${
                      isActive ? "bg-slate-900" : "bg-slate-100"
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${isActive ? "text-white" : "text-slate-700"}`}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View className="mx-5 mt-5">
          {filteredItems.length ? (
            filteredItems.map((item) => (
              <View
                key={item.id}
                className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-slate-900">{item.name}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{item.sku}</Text>
                  </View>
                  <View className={`rounded-full px-3 py-1 ${getStatusClasses(item.status)}`}>
                    <Text className="text-xs font-semibold">{getStatusLabel(item.status)}</Text>
                  </View>
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-sm text-slate-500">{item.location}</Text>
                  <Text className="text-sm font-semibold text-slate-700">
                    {item.stock}/{item.target}
                  </Text>
                </View>

                <View className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <View
                    className={`h-full rounded-full ${
                      item.status === "critical"
                        ? "bg-rose-500"
                        : item.status === "low"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${getProgressWidth(item)}%` }}
                  />
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-xs text-slate-400">Updated {item.updatedAt}</Text>
                  <Text className="text-xs font-semibold text-slate-500">
                    {Math.round((item.stock / item.target) * 100)}% target
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
              <Text className="text-base font-semibold text-slate-900">No inventory matches</Text>
              <Text className="mt-2 text-sm text-slate-500">
                Try another search term or switch the filter.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
