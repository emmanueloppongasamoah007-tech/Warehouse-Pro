import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePalette } from '@/hooks/use-palette';
import { ApiError, apiGet } from '@/lib/client';
import { useActiveOrderStore, type Order } from '@/store/use-active-order-store';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; orders: Order[] };

/** Only PENDING and COMPLETED exist today; anything else falls back to slate. */
function statusStyles(status: string) {
  switch (status) {
    case 'COMPLETED':
      return {
        pill: 'bg-emerald-100 dark:bg-emerald-500/20',
        label: 'text-emerald-700 dark:text-emerald-300',
      };
    case 'PENDING':
      return {
        pill: 'bg-amber-100 dark:bg-amber-500/20',
        label: 'text-amber-700 dark:text-amber-300',
      };
    default:
      return {
        pill: 'bg-slate-100 dark:bg-slate-800',
        label: 'text-slate-600 dark:text-slate-300',
      };
  }
}

export default function OrdersScreen() {
  const router = useRouter();
  const palette = usePalette();
  const setActiveOrder = useActiveOrderStore((state) => state.setActiveOrder);
  const activeOrderId = useActiveOrderStore((state) => state.order?.id ?? null);

  const [state, setState] = useState<LoadState>({ status: 'loading' });

  // Refetching on focus means fast tab switching can leave two requests in
  // flight; this drops the response of any but the most recent one, so a slow
  // earlier fetch cannot overwrite fresher data.
  const requestId = useRef(0);

  const loadOrders = useCallback(async () => {
    const id = ++requestId.current;
    // Holds the current list on screen while refetching. Resetting to 'loading'
    // unconditionally would flash a full-screen spinner over data that is
    // already correct every time the tab regains focus.
    setState((prev) => (prev.status === 'ready' ? prev : { status: 'loading' }));
    try {
      const orders = await apiGet<Order[]>('/api/orders');
      if (id !== requestId.current) return;
      setState({ status: 'ready', orders });
    } catch (error) {
      if (id !== requestId.current) return;
      // ApiError means the backend answered - show its status and message.
      // Anything else never reached the backend, so its message names the URL.
      setState({
        status: 'error',
        message:
          error instanceof ApiError
            ? `HTTP ${error.status}: ${error.body || 'no response body'}`
            : error instanceof Error
              ? error.message
              : 'Unknown error.',
      });
    }
  }, []);

  // Runs on first mount and on every return to this tab, so an order completed
  // on the Routes screen shows its new status here. The callback must be
  // memoised - useFocusEffect re-subscribes on every render otherwise.
  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  function openOrder(order: Order) {
    setActiveOrder(order);
    // Routes reads the store on focus, so it re-optimizes for this order.
    router.navigate('/routes');
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar style="auto" />

      {/* Same pattern as Routes: SafeAreaView carries flex-1 so the ScrollView
          inside gets a bounded height and actually scrolls. Bottom edge is left
          to the tab bar, which already insets itself. */}
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-10 pt-6"
          showsVerticalScrollIndicator={false}>
          <Text className="text-3xl font-bold text-slate-900 dark:text-slate-100">Orders</Text>
          <Text className="mt-1 text-base text-slate-500 dark:text-slate-400">
            Tap an order to plan its picking route
          </Text>

          {state.status === 'loading' ? (
            <View className="mt-6 items-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <ActivityIndicator color={palette.accent} />
              <Text className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Loading orders...
              </Text>
            </View>
          ) : null}

          {state.status === 'error' ? (
            <View className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/10">
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={20}
                  color={palette.onDangerSurface}
                />
                <Text className="ml-2 text-base font-semibold text-red-800 dark:text-red-400">
                  Could not load orders
                </Text>
              </View>
              <Text className="mt-2 text-sm leading-5 text-red-700 dark:text-red-400">
                {state.message}
              </Text>
              <Pressable
                onPress={loadOrders}
                accessibilityRole="button"
                accessibilityLabel="Retry"
                className="mt-4 h-11 flex-row items-center justify-center rounded-full bg-red-600 active:bg-red-700">
                <MaterialCommunityIcons name="refresh" size={18} color="#ffffff" />
                <Text className="ml-2 text-base font-semibold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {state.status === 'ready' && state.orders.length === 0 ? (
            <View className="mt-6 items-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <MaterialCommunityIcons
                name="clipboard-outline"
                size={40}
                color={palette.faint}
              />
              <Text className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
                No orders yet
              </Text>
              <Text className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
                Orders created on the backend will appear here.
              </Text>
            </View>
          ) : null}

          {state.status === 'ready'
            ? state.orders.map((order) => {
                const badge = statusStyles(order.status);
                const isActive = order.id === activeOrderId;
                const preview = order.pickListCodes.slice(0, 3);
                const remaining = order.pickListCodes.length - preview.length;

                return (
                  <Pressable
                    key={order.id}
                    onPress={() => openOrder(order)}
                    accessibilityRole="button"
                    accessibilityLabel={`Order ${order.id}, ${order.pickListCodes.length} bins, ${order.status}`}
                    className={`mt-4 rounded-2xl border bg-white p-5 active:bg-slate-50 dark:bg-slate-900 dark:active:bg-slate-800 ${
                      isActive ? 'border-orange-400' : 'border-slate-200 dark:border-slate-800'
                    }`}>
                    <View className="flex-row items-center">
                      <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Order #{order.id}
                      </Text>
                      <View className={`ml-2 rounded-full px-2.5 py-0.5 ${badge.pill}`}>
                        <Text className={`text-xs font-semibold ${badge.label}`}>
                          {order.status}
                        </Text>
                      </View>
                      <View className="flex-1" />
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={22}
                        color={palette.muted}
                      />
                    </View>

                    <View className="mt-2 flex-row items-center">
                      <MaterialCommunityIcons
                        name="package-variant"
                        size={15}
                        color={palette.meta}
                      />
                      <Text className="ml-1.5 text-sm text-slate-600 dark:text-slate-300">
                        {order.pickListCodes.length}{' '}
                        {order.pickListCodes.length === 1 ? 'bin' : 'bins'}
                      </Text>
                      <Text className="mx-2 text-sm text-slate-300 dark:text-slate-500">·</Text>
                      <MaterialCommunityIcons
                        name="map-marker-outline"
                        size={15}
                        color={palette.meta}
                      />
                      <Text className="ml-1 text-sm text-slate-600 dark:text-slate-300">
                        {order.startCode}
                      </Text>
                    </View>

                    <View className="mt-3 flex-row flex-wrap items-center">
                      {preview.map((code) => (
                        <View
                          key={code}
                          className="mr-2 mt-1 rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          <Text className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {code}
                          </Text>
                        </View>
                      ))}
                      {remaining > 0 ? (
                        <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          +{remaining} more
                        </Text>
                      ) : null}
                    </View>

                    {isActive ? (
                      <Text className="mt-3 text-xs font-semibold uppercase tracking-wide text-orange-600">
                        Active on Routes
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })
            : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
