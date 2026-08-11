import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RequireAdmin } from '@/components/require-admin';
import { OrderAnalytics } from '@/components/order-analytics';
import { usePalette } from '@/hooks/use-palette';
import { ApiError, apiGet } from '@/lib/client';
import { type Order } from '@/store/use-active-order-store';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; orders: Order[] };

type Filter = 'all' | 'pending' | 'completed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
];

export default function HistoryScreen() {
  const palette = usePalette();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [filter, setFilter] = useState<Filter>('all');

  // Refetching on focus can leave two requests in flight; this drops all but
  // the most recent, so a slow earlier fetch cannot overwrite fresher data.
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    // Holds the current list while refetching rather than flashing a spinner
    // over data that is already correct.
    setState((prev) => (prev.status === 'ready' ? prev : { status: 'loading' }));
    try {
      const orders = await apiGet<Order[]>('/api/orders');
      if (id !== requestId.current) return;
      setState({ status: 'ready', orders });
    } catch (error) {
      if (id !== requestId.current) return;
      setState({ status: 'error', message: describeError(error) });
    }
  }, []);

  // Orders are created and completed on other screens, so this reloads on every
  // return rather than only on mount.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const orders = state.status === 'ready' ? state.orders : [];

  const counts = useMemo(
    () => ({
      all: orders.length,
      pending: orders.filter((order) => order.status !== 'COMPLETED').length,
      completed: orders.filter((order) => order.status === 'COMPLETED').length,
    }),
    [orders],
  );

  const visible = useMemo(() => {
    if (filter === 'completed') return orders.filter((o) => o.status === 'COMPLETED');
    if (filter === 'pending') return orders.filter((o) => o.status !== 'COMPLETED');
    return orders;
  }, [orders, filter]);

  return (
    <RequireAdmin>
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
        <StatusBar style="auto" />

        <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
          <View className="px-6 pb-3 pt-6">
            <Text className="text-3xl font-bold text-slate-900 dark:text-slate-100">History</Text>
            <Text className="mt-1 text-base text-slate-500 dark:text-slate-400">
              {counts.completed} completed · {counts.pending} pending
            </Text>

            <View className="mt-4 flex-row gap-2">
              {FILTERS.map((option) => {
                const isActive = option.key === filter;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setFilter(option.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isActive }}
                    className={`h-9 flex-row items-center rounded-full border px-4 ${
                      isActive
                        ? 'border-orange-500 bg-orange-500'
                        : 'border-slate-300 bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:active:bg-slate-800'
                    }`}>
                    <Text
                      className={`text-sm font-semibold ${
                        isActive ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                      {option.label} {counts[option.key]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="px-6 pb-10 pt-1"
            showsVerticalScrollIndicator={false}>
            {state.status === 'loading' ? (
              <View className="mt-4 items-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
                <ActivityIndicator color={palette.accent} />
                <Text className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  Loading history...
                </Text>
              </View>
            ) : null}

            {state.status === 'error' ? (
              <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/10">
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={20}
                    color={palette.onDangerSurface}
                  />
                  <Text className="ml-2 text-base font-semibold text-red-800 dark:text-red-400">
                    Could not load history
                  </Text>
                </View>
                <Text className="mt-2 text-sm leading-5 text-red-700 dark:text-red-400">
                  {state.message}
                </Text>
                <Pressable
                  onPress={load}
                  accessibilityRole="button"
                  accessibilityLabel="Retry"
                  className="mt-4 h-11 flex-row items-center justify-center rounded-full bg-red-600 active:bg-red-700">
                  <MaterialCommunityIcons name="refresh" size={18} color="#ffffff" />
                  <Text className="ml-2 text-base font-semibold text-white">Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Analytics summarise every order, so they sit above the filter
                chips and stay constant as the list below is filtered. */}
            {state.status === 'ready' && orders.length > 0 ? (
              <View className="mt-1">
                <OrderAnalytics orders={orders} />
              </View>
            ) : null}

            {state.status === 'ready' && visible.length === 0 ? (
              <View className="mt-4 items-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
                <MaterialCommunityIcons name="history" size={40} color={palette.faint} />
                <Text className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
                  {orders.length === 0 ? 'No orders yet' : `No ${filter} orders`}
                </Text>
                <Text className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
                  {orders.length === 0
                    ? 'Orders you create will appear here.'
                    : 'Try a different filter.'}
                </Text>
              </View>
            ) : null}

            {state.status === 'ready'
              ? visible.map((order) => <HistoryCard key={order.id} order={order} />)
              : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </RequireAdmin>
  );
}

function HistoryCard({ order }: { order: Order }) {
  const palette = usePalette();
  const isCompleted = order.status === 'COMPLETED';
  const picked = order.items.filter((item) => item.picked).length;
  const total = order.items.length;
  const duration = formatDuration(order.createdAt, order.completedAt);

  return (
    <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <View className="flex-row items-center">
        <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Order #{order.id}
        </Text>
        <View
          className={`ml-2 rounded-full px-2.5 py-0.5 ${
            isCompleted
              ? 'bg-emerald-100 dark:bg-emerald-500/20'
              : 'bg-amber-100 dark:bg-amber-500/20'
          }`}>
          <Text
            className={`text-xs font-semibold ${
              isCompleted
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-amber-700 dark:text-amber-300'
            }`}>
            {order.status}
          </Text>
        </View>
        <View className="flex-1" />
        <Text className="text-xs text-slate-400 dark:text-slate-500">
          {formatDate(order.createdAt)}
        </Text>
      </View>

      <View className="mt-3 flex-row items-center">
        <MaterialCommunityIcons name="map-marker-outline" size={15} color={palette.meta} />
        <Text className="ml-1 text-sm text-slate-600 dark:text-slate-300">{order.startCode}</Text>
        <Text className="mx-2 text-sm text-slate-300 dark:text-slate-500">·</Text>
        <MaterialCommunityIcons name="package-variant" size={15} color={palette.meta} />
        <Text className="ml-1.5 text-sm text-slate-600 dark:text-slate-300">
          {total} {total === 1 ? 'bin' : 'bins'}
        </Text>
        {duration ? (
          <>
            <Text className="mx-2 text-sm text-slate-300 dark:text-slate-500">·</Text>
            <MaterialCommunityIcons name="clock-outline" size={15} color={palette.meta} />
            <Text className="ml-1.5 text-sm text-slate-600 dark:text-slate-300">{duration}</Text>
          </>
        ) : null}
      </View>

      {/* Progress is only meaningful while work is outstanding; a completed
          order is 100% by definition and the bar would be noise. */}
      {!isCompleted ? (
        <>
          <View className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <View
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${total ? (picked / total) * 100 : 0}%` }}
            />
          </View>
          <Text className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {picked} of {total} picked
          </Text>
        </>
      ) : null}
    </View>
  );
}

/**
 * Elapsed time between creation and completion.
 *
 * Null while the order is still open - there is no meaningful duration for work
 * that has not finished, and showing "time since created" would read as a
 * completion time.
 */
function formatDuration(createdAt: string, completedAt: string | null): string | null {
  if (!completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;

  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
}

/** Date only for older orders, time only for today's. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** ApiError means the backend answered; anything else never reached it. */
function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.body) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      // Not JSON - fall through to the raw body.
    }
    return `HTTP ${error.status}: ${error.body || 'no response body'}`;
  }
  return error instanceof Error ? error.message : 'Unknown error.';
}
