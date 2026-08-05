import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useOptimizeRoute } from "@/hooks/useOptimizeRoute";
import { useRouteStore } from "@/store/routeStore";
import { WarehouseMap } from "@/components/WarehouseMap";

export default function RoutesScreen() {
  const activeOrder = useRouteStore((state) => state.activeOrder);
  const orderedBinCodes = useRouteStore((state) => state.orderedBinCodes);
  const totalDistance = useRouteStore((state) => state.totalDistance);
  const pickedBins = useRouteStore((state) => state.pickedBins);
  const isLoading = useRouteStore((state) => state.isLoading);
  const error = useRouteStore((state) => state.error);
  const confirmPick = useRouteStore((state) => state.confirmPick);
  const resetRoute = useRouteStore((state) => state.resetRoute);
  const optimizeRoute = useOptimizeRoute();

  useEffect(() => {
    if (!orderedBinCodes.length && !isLoading && !error) {
      optimizeRoute();
    }
  }, [error, isLoading, orderedBinCodes.length, optimizeRoute]);

  const currentStepIndex = useMemo(
    () => orderedBinCodes.findIndex((code) => !pickedBins.has(code)),
    [orderedBinCodes, pickedBins]
  );

  const totalPickStops = Math.max(0, orderedBinCodes.length - 1);
  const completedPicks = orderedBinCodes.filter(
    (code, index) => index > 0 && pickedBins.has(code)
  ).length;

  const currentBinCode =
    currentStepIndex >= 0 && orderedBinCodes[currentStepIndex]
      ? orderedBinCodes[currentStepIndex]
      : null;

  const isComplete = orderedBinCodes.length > 0 && currentStepIndex === -1;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-6">
        <Text className="text-3xl font-semibold text-slate-900">Picker Home</Text>
        <Text className="mt-2 text-sm text-slate-500">
          Start: {activeOrder.startCode} · {activeOrder.pickListCodes.length} bins
        </Text>
      </View>

      <View className="mx-5 mt-6 rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/70">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm uppercase tracking-[0.3em] text-slate-400">
              Active route
            </Text>
            <Text className="mt-2 text-2xl font-semibold text-slate-900">
              Route overview
            </Text>
          </View>
          <Text className="text-sm font-semibold text-slate-700">
            {totalDistance ? `${totalDistance.toFixed(1)}m` : "--"}
          </Text>
        </View>

        <View className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
          <View
            className="h-full rounded-full bg-emerald-500"
            style={{
              width: `${totalPickStops ? (completedPicks / totalPickStops) * 100 : 0}%`,
            }}
          />
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-sm text-slate-600">
            {completedPicks} / {totalPickStops} picked
          </Text>
          {isComplete ? (
            <Text className="text-sm font-semibold text-emerald-600">Complete</Text>
          ) : (
            <Text className="text-sm text-slate-500">
              Next: {currentBinCode ?? "--"}
            </Text>
          )}
        </View>

        {error ? (
          <View className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <Text className="font-semibold text-orange-700">Route error</Text>
            <Text className="mt-1 text-sm text-orange-700">{error}</Text>
            <Pressable
              onPress={optimizeRoute}
              className="mt-4 rounded-2xl bg-orange-500 px-4 py-3"
            >
              <Text className="text-center font-semibold text-white">Retry optimize</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading ? (
          <View className="mt-6 items-center justify-center">
            <ActivityIndicator size="large" color="#0f766e" />
            <Text className="mt-3 text-sm text-slate-500">Optimizing route...</Text>
          </View>
        ) : null}
      </View>

      {orderedBinCodes.length ? (
        <View className="mx-5 mt-6">
          <WarehouseMap
            orderedBinCodes={orderedBinCodes}
            pickedBins={pickedBins}
            currentBinCode={currentBinCode}
          />
        </View>
      ) : null}

      <ScrollView className="mt-6 px-5">
        {orderedBinCodes.length ? (
          <View className="space-y-3">
            {orderedBinCodes.map((code, index) => {
              const isStart = index === 0;
              const isPicked = pickedBins.has(code);
              const isCurrent = currentBinCode === code;

              return (
                <View
                  key={code}
                  className={`rounded-3xl border p-4 ${
                    isCurrent
                      ? "border-cyan-500 bg-cyan-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-xs uppercase text-slate-400">
                        {isStart ? "Start location" : `Pick ${index}`}
                      </Text>
                      <Text className="mt-1 text-lg font-semibold text-slate-900">
                        {code}
                      </Text>
                    </View>
                    <View className="rounded-full px-3 py-1">
                      <Text
                        className={`text-xs font-semibold ${
                          isPicked ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {isPicked ? "Picked" : isCurrent ? "Now" : "Pending"}
                      </Text>
                    </View>
                  </View>

                  {!isStart ? (
                    <View className="mt-4 flex-row items-center justify-between">
                      <Text className="text-sm text-slate-500">
                        {isPicked
                          ? "Picked"
                          : isCurrent
                          ? "Confirm this pick"
                          : "Upcoming"}
                      </Text>
                      {isCurrent && !isComplete ? (
                        <Pressable
                          onPress={() => confirmPick(code)}
                          className="rounded-2xl bg-slate-900 px-4 py-3"
                        >
                          <Text className="font-semibold text-white">Confirm pick</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : !isLoading ? (
          <View className="rounded-3xl border border-slate-200 bg-white p-6">
            <Text className="text-base text-slate-600">Waiting for route data...</Text>
          </View>
        ) : null}
      </ScrollView>

      {isComplete ? (
        <View className="mx-5 mb-6 mt-5 rounded-3xl bg-emerald-500 p-5">
          <Text className="text-lg font-semibold text-white">Order complete</Text>
          <Text className="mt-2 text-sm text-emerald-100">
            All pick locations have been confirmed.
          </Text>
          <Pressable
            onPress={resetRoute}
            className="mt-4 rounded-2xl bg-white px-4 py-3"
          >
            <Text className="text-center font-semibold text-emerald-700">
              Restart route
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
