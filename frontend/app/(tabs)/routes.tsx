import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WarehouseMap, type Aisle, type Bin } from '@/components/warehouse-map';
import { ApiError, apiGet, apiPatch, apiPost } from '@/lib/client';
import {
  FALLBACK_PICK_LIST_CODES,
  FALLBACK_START_CODE,
  useActiveOrderStore,
  type Order,
  type OrderItem,
} from '@/store/use-active-order-store';

/** Response shape of POST /api/routes/optimize (backend dto/RouteResponse.java). */
type RouteResponse = {
  orderedBinCodes: string[];
  totalDistance: number;
};

type RouteData = {
  route: RouteResponse;
  aisles: Aisle[];
  bins: Bin[];
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: RouteData };

/** ApiError means the backend answered; anything else never reached it. */
function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return `HTTP ${error.status}: ${error.body || 'no response body'}`;
  }
  return error instanceof Error ? error.message : 'Unknown error.';
}

export default function RoutesScreen() {
  const router = useRouter();
  const activeOrder = useActiveOrderStore((state) => state.order);
  const setActiveOrder = useActiveOrderStore((state) => state.setActiveOrder);

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // Failures from the pick/complete PATCHes. Kept separate from the load state
  // so a failed pick leaves the route on screen instead of replacing it.
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);

  // Falls back to the seeded sample when no order has been picked, so reaching
  // this tab directly still shows a working route.
  const startCode = activeOrder?.startCode ?? FALLBACK_START_CODE;
  const rawPickList = activeOrder?.pickListCodes ?? FALLBACK_PICK_LIST_CODES;

  // Marking an item picked replaces the stored order, so `pickListCodes` comes
  // back as a new array with identical contents. Keying the memo on the joined
  // codes keeps the identity stable, otherwise loadRoute's deps change and the
  // route re-optimizes (resetting the map) after every pick.
  const pickListKey = rawPickList.join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pickListCodes = useMemo(() => rawPickList, [pickListKey]);

  const loadRoute = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      // Layout data is fetched alongside the route rather than after it: the
      // three are independent, so serialising them would just add latency.
      //
      // /api/bins is needed as well as /api/aisles because the packing station
      // has no aisle (DataSeeder saves PACK-01 without one), so it appears in
      // no aisle's nested bins - and it is exactly the bin the "S" marker needs.
      const [route, aisles, bins] = await Promise.all([
        apiPost<RouteResponse>('/api/routes/optimize', {
          startCode,
          pickListCodes,
        }),
        apiGet<Aisle[]>('/api/aisles'),
        apiGet<Bin[]>('/api/bins'),
      ]);
      setState({ status: 'ready', data: { route, aisles, bins } });
    } catch (error) {
      setState({ status: 'error', message: describeError(error) });
    }
  }, [startCode, pickListCodes]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  // Route order, start bin removed - the optimizer returns it at index 0.
  const routeStops =
    state.status === 'ready' ? state.data.route.orderedBinCodes.slice(1) : pickListCodes;

  // Pick actions need OrderItem ids, which only exist when a real order is
  // active. Without one the screen stays read-only.
  const items = activeOrder?.items ?? [];
  // Keyed by bin code because the route is in optimized order while items are
  // in submission order. A bin appearing twice in one order would collapse here;
  // the backend's pick list is a set of bins, so that does not occur today.
  const itemByCode = useMemo(
    () => new Map(items.map((item) => [item.binCode, item])),
    [items],
  );

  // Derived from the same `items` the progress bar reads, so the map and the
  // counter can never disagree about what has been picked.
  const pickedCodes = useMemo(
    () => items.filter((item) => item.picked).map((item) => item.binCode),
    [items],
  );

  const pickedCount = activeOrder ? items.filter((item) => item.picked).length : 0;
  const totalStops = activeOrder ? items.length : routeStops.length;
  const nextStop = routeStops.find((code) => !itemByCode.get(code)?.picked) ?? null;
  const allPicked = Boolean(activeOrder) && items.length > 0 && pickedCount === items.length;
  const isCompleted = activeOrder?.status === 'COMPLETED';

  async function handlePick(item: OrderItem) {
    if (!activeOrder) return;
    setActionError(null);
    setPendingItemId(item.id);
    try {
      // The endpoint returns the whole updated order, so the store can be
      // refreshed from one response rather than re-fetching.
      const updated = await apiPatch<Order>(
        `/api/orders/${activeOrder.id}/items/${item.id}/pick`,
      );
      setActiveOrder(updated);
    } catch (error) {
      setActionError(describeError(error));
    } finally {
      setPendingItemId(null);
    }
  }

  async function handleComplete() {
    if (!activeOrder) return;
    setActionError(null);
    setCompleting(true);
    try {
      const updated = await apiPatch<Order>(`/api/orders/${activeOrder.id}/complete`);
      setActiveOrder(updated);
      router.navigate('/orders');
    } catch (error) {
      setActionError(describeError(error));
    } finally {
      setCompleting(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />

      {/* SafeAreaView from react-native-safe-area-context, and it must carry
          flex-1 so the ScrollView inside it gets a bounded height - without a
          bounded parent the scroll view collapses and nothing scrolls.
          Bottom edge is left to the tab bar, which already insets itself. */}
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-10 pt-6"
          showsVerticalScrollIndicator={false}>
          <Text className="text-3xl font-bold text-slate-900">Picker Home</Text>
          <Text className="mt-1 text-base text-slate-500">
            {activeOrder ? `Order #${activeOrder.id}` : 'Sample route'} · Start: {startCode} ·{' '}
            {pickListCodes.length} bins
          </Text>

          {state.status === 'loading' ? (
            <View className="mt-6 items-center rounded-2xl border border-slate-200 bg-white p-8">
              <ActivityIndicator color="#f97316" />
              <Text className="mt-3 text-sm text-slate-500">Optimizing route...</Text>
            </View>
          ) : null}

          {state.status === 'error' ? (
            <View className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#b91c1c" />
                <Text className="ml-2 text-base font-semibold text-red-800">
                  Could not load route
                </Text>
              </View>
              <Text className="mt-2 text-sm leading-5 text-red-700">{state.message}</Text>
              <Pressable
                onPress={loadRoute}
                accessibilityRole="button"
                accessibilityLabel="Retry"
                className="mt-4 h-11 flex-row items-center justify-center rounded-full bg-red-600 active:bg-red-700">
                <MaterialCommunityIcons name="refresh" size={18} color="#ffffff" />
                <Text className="ml-2 text-base font-semibold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {state.status === 'ready' ? (
            <View className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Route overview
              </Text>

              <View className="mt-4 flex-row">
                <View className="flex-1">
                  <Text className="text-xs text-slate-500">Total distance</Text>
                  <Text className="mt-0.5 text-2xl font-bold text-slate-900">
                    {state.data.route.totalDistance.toFixed(1)}
                    <Text className="text-base font-medium text-slate-500"> m</Text>
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-xs text-slate-500">Progress</Text>
                  <Text className="mt-0.5 text-2xl font-bold text-slate-900">
                    {pickedCount}
                    <Text className="text-base font-medium text-slate-500">
                      {' '}
                      / {totalStops} picked
                    </Text>
                  </Text>
                </View>
              </View>

              {/* Progress bar. The filled width is an inline style because the
                  percentage is computed at runtime; NativeWind needs literal
                  class names it can find at build time. */}
              <View className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <View
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${totalStops ? (pickedCount / totalStops) * 100 : 0}%` }}
                />
              </View>

              <View className="mt-5 flex-row items-center rounded-xl bg-orange-50 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
                  <MaterialCommunityIcons name="map-marker-outline" size={22} color="#ffffff" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-xs font-medium uppercase tracking-wide text-orange-700">
                    Next
                  </Text>
                  <Text className="text-lg font-bold text-slate-900">
                    {nextStop ?? 'Route complete'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {state.status === 'ready' ? (
            <View className="mt-6">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Warehouse map
              </Text>
              <WarehouseMap
                aisles={state.data.aisles}
                bins={state.data.bins}
                routeCodes={state.data.route.orderedBinCodes}
                pickedCodes={pickedCodes}
              />

              <View className="mt-4 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-900">
                  <Text className="text-sm font-bold text-white">S</Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Current location
                  </Text>
                  <Text className="text-lg font-bold text-slate-900">
                    {state.data.route.orderedBinCodes[0] ?? startCode}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Stops list. Rendered only for a real order - the fallback sample
              route has no OrderItem ids, so there is nothing to mark picked. */}
          {state.status === 'ready' && activeOrder ? (
            <View className="mt-6">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Stops
              </Text>

              {routeStops.map((code, index) => {
                const item = itemByCode.get(code);
                const picked = item?.picked ?? false;
                const isPending = item != null && pendingItemId === item.id;
                const isNext = code === nextStop;

                return (
                  <View
                    key={`${code}-${index}`}
                    className={`mb-3 flex-row items-center rounded-2xl border bg-white p-4 ${
                      isNext ? 'border-orange-400' : 'border-slate-200'
                    }`}>
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-full ${
                        picked ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}>
                      {picked ? (
                        <MaterialCommunityIcons name="check" size={18} color="#ffffff" />
                      ) : (
                        <Text className="text-sm font-bold text-slate-600">{index + 1}</Text>
                      )}
                    </View>

                    <View className="ml-3 flex-1">
                      <Text
                        className={`text-base font-semibold ${
                          picked ? 'text-slate-400 line-through' : 'text-slate-900'
                        }`}>
                        {code}
                      </Text>
                      {isNext && !picked ? (
                        <Text className="text-xs font-medium uppercase tracking-wide text-orange-600">
                          Next stop
                        </Text>
                      ) : null}
                    </View>

                    {item == null ? (
                      // A route stop with no matching OrderItem: possible if the
                      // order and the optimizer disagree about the bin list.
                      <Text className="text-xs text-slate-400">Not in order</Text>
                    ) : picked ? (
                      <Text className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                        Picked
                      </Text>
                    ) : (
                      <Pressable
                        onPress={() => handlePick(item)}
                        disabled={isPending || isCompleted}
                        accessibilityRole="button"
                        accessibilityLabel={`Mark ${code} as picked`}
                        accessibilityState={{ disabled: isPending || isCompleted }}
                        className={`h-10 min-w-[104px] flex-row items-center justify-center rounded-full px-4 ${
                          isPending || isCompleted
                            ? 'bg-orange-300'
                            : 'bg-orange-500 active:bg-orange-600'
                        }`}>
                        {isPending ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text className="text-sm font-semibold text-white">Mark picked</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              })}

              {actionError ? (
                <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
                  <Text className="text-sm text-red-700">{actionError}</Text>
                </View>
              ) : null}

              {isCompleted ? (
                <View className="flex-row items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={22}
                    color="#047857"
                  />
                  <Text className="ml-2 text-base font-semibold text-emerald-800">
                    Order #{activeOrder.id} completed
                  </Text>
                </View>
              ) : allPicked ? (
                <Pressable
                  onPress={handleComplete}
                  disabled={completing}
                  accessibilityRole="button"
                  accessibilityLabel="Complete order"
                  accessibilityState={{ disabled: completing }}
                  className={`h-14 flex-row items-center justify-center rounded-full ${
                    completing ? 'bg-emerald-300' : 'bg-emerald-600 active:bg-emerald-700'
                  }`}>
                  {completing ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check-circle" size={20} color="#ffffff" />
                      <Text className="ml-2 text-lg font-semibold text-white">Complete order</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
