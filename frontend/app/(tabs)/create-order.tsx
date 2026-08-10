import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FIELD_BASE_CLASSNAME, STABLE_TEXT_STYLE } from '@/components/field-config';
import { RequireAdmin } from '@/components/require-admin';
import { type Aisle, type Bin } from '@/components/warehouse-map';
import { filterBins, groupBinsByAisle, unaisledBins } from '@/lib/bin-search';
import { ApiError, apiGet, apiPost } from '@/lib/client';

type SetupData = {
  aisles: Aisle[];
  bins: Bin[];
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: SetupData };

type Feedback = { tone: 'error' | 'success'; message: string } | null;

/** Matches backend dto/OrderResponse.java, only the fields shown on success. */
type CreatedOrder = { id: number; pickListCodes: string[] };

export default function CreateOrderScreen() {
  const router = useRouter();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [startCode, setStartCode] = useState<string | null>(null);
  // Insertion order is preserved so the admin sees the list as they built it,
  // even though the optimizer reorders it on the picker's side.
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    // Holds the current list while refetching, so returning to this tab does
    // not flash a spinner over data that is already on screen.
    setState((prev) => (prev.status === 'ready' ? prev : { status: 'loading' }));
    try {
      const [bins, aisles] = await Promise.all([
        apiGet<Bin[]>('/api/bins'),
        apiGet<Aisle[]>('/api/aisles'),
      ]);
      setState({ status: 'ready', data: { aisles, bins } });
    } catch (error) {
      setState({ status: 'error', message: describeError(error) });
    }
  }, []);

  // Refetches on every return to this tab. Tab screens stay mounted, so a
  // mount-only load would keep showing the layout as it was when the app
  // started - an aisle added on the Dashboard would never appear here.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const aisles = state.status === 'ready' ? state.data.aisles : [];
  const bins = state.status === 'ready' ? state.data.bins : [];

  // Bins with no aisle are the packing stations - the only sensible start
  // points. Offered as a choice rather than a text field, since a mistyped
  // code is a 400 from the backend.
  const startOptions = useMemo(() => unaisledBins(aisles, bins), [aisles, bins]);

  // Default to the first packing station once the layout loads, so the common
  // case needs no interaction.
  useEffect(() => {
    if (startCode === null && startOptions.length > 0) {
      setStartCode(startOptions[0].code);
    }
  }, [startCode, startOptions]);

  // The start bin is not pickable, so it is excluded from the selectable list.
  const pickableBins = useMemo(
    () => bins.filter((bin) => bin.code !== startCode),
    [bins, startCode],
  );
  const matches = useMemo(() => filterBins(pickableBins, query), [pickableBins, query]);
  const groups = useMemo(() => groupBinsByAisle(aisles, matches), [aisles, matches]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggleBin(code: string) {
    setFeedback(null);
    setSelected((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  async function handleCreate() {
    setFeedback(null);

    if (!startCode) {
      setFeedback({ tone: 'error', message: 'Choose a start location.' });
      return;
    }
    if (selected.length === 0) {
      setFeedback({ tone: 'error', message: 'Add at least one bin to the pick list.' });
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiPost<CreatedOrder>('/api/orders', {
        startCode,
        pickListCodes: selected,
      });
      setSelected([]);
      setQuery('');
      setFeedback({
        tone: 'success',
        message: `Order #${created.id} created with ${created.pickListCodes.length} ${
          created.pickListCodes.length === 1 ? 'bin' : 'bins'
        }.`,
      });
    } catch (error) {
      setFeedback({ tone: 'error', message: describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAdmin>
      <View className="flex-1 bg-slate-50">
        <StatusBar style="dark" />

        <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="px-6 pb-3 pt-6">
              <Text className="text-3xl font-bold text-slate-900">Create order</Text>
              <Text className="mt-1 text-base text-slate-500">
                {selected.length > 0
                  ? `${selected.length} ${selected.length === 1 ? 'bin' : 'bins'} selected`
                  : 'Search by product or bin code'}
              </Text>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerClassName="px-6 pb-10"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {state.status === 'loading' ? (
                <View className="mt-4 items-center rounded-2xl border border-slate-200 bg-white p-8">
                  <ActivityIndicator color="#f97316" />
                  <Text className="mt-3 text-sm text-slate-500">Loading locations...</Text>
                </View>
              ) : null}

              {state.status === 'error' ? (
                <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5">
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#b91c1c" />
                    <Text className="ml-2 text-base font-semibold text-red-800">
                      Could not load locations
                    </Text>
                  </View>
                  <Text className="mt-2 text-sm leading-5 text-red-700">{state.message}</Text>
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

              {state.status === 'ready' ? (
                <>
                  <Text className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Start location
                  </Text>
                  {startOptions.length === 0 ? (
                    <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <Text className="text-sm leading-5 text-amber-800">
                        No packing station found. A bin that belongs to no aisle is needed as the
                        route start point.
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row flex-wrap gap-2">
                      {startOptions.map((bin) => {
                        const isActive = bin.code === startCode;
                        return (
                          <Pressable
                            key={bin.id}
                            onPress={() => setStartCode(bin.code)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isActive }}
                            className={`h-10 flex-row items-center rounded-full border px-4 ${
                              isActive
                                ? 'border-orange-500 bg-orange-500'
                                : 'border-slate-300 bg-white active:bg-slate-100'
                            }`}>
                            <Text
                              className={`text-sm font-semibold ${
                                isActive ? 'text-white' : 'text-slate-700'
                              }`}>
                              {bin.code}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  {selected.length > 0 ? (
                    <View className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <Text className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                        Pick list
                      </Text>
                      <View className="mt-2 flex-row flex-wrap gap-2">
                        {selected.map((code) => (
                          <Pressable
                            key={code}
                            onPress={() => toggleBin(code)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${code}`}
                            className="h-8 flex-row items-center rounded-full bg-white px-3">
                            <Text className="text-xs font-semibold text-slate-800">{code}</Text>
                            <MaterialCommunityIcons name="close" size={13} color="#94a3b8" />
                          </Pressable>
                        ))}
                      </View>
                      <Text className="mt-2 text-xs leading-4 text-orange-700">
                        The picker walks these in the optimizer&apos;s order, not this one.
                      </Text>
                    </View>
                  ) : null}

                  <View className="relative mt-5 justify-center">
                    <View className="absolute left-3 z-10">
                      <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
                    </View>
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Search product or bin code"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                      // Matches the Inventory search: the suggestion engine
                      // re-measures unrecognised text and makes it visibly shift.
                      autoCorrect={false}
                      spellCheck={false}
                      textAlignVertical="center"
                      multiline={false}
                      returnKeyType="search"
                      className={`${FIELD_BASE_CLASSNAME} pl-10 pr-10`}
                      style={STABLE_TEXT_STYLE}
                    />
                    {query.trim().length > 0 ? (
                      <Pressable
                        onPress={() => setQuery('')}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                        className="absolute right-3 p-1">
                        <MaterialCommunityIcons name="close-circle" size={18} color="#94a3b8" />
                      </Pressable>
                    ) : null}
                  </View>

                  {groups.length === 0 ? (
                    <View className="mt-5 items-center rounded-2xl border border-slate-200 bg-white p-8">
                      <MaterialCommunityIcons name="magnify-close" size={36} color="#cbd5e1" />
                      <Text className="mt-3 text-sm text-slate-500">
                        No bins match “{query.trim()}”.
                      </Text>
                    </View>
                  ) : null}

                  {groups.map((group) => (
                    <View key={group.name} className="mt-5">
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {group.name}
                      </Text>
                      <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {group.bins.map((bin, index) => {
                          const isSelected = selectedSet.has(bin.code);
                          return (
                            <Pressable
                              key={bin.id}
                              onPress={() => toggleBin(bin.code)}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: isSelected }}
                              accessibilityLabel={`${bin.code}, ${bin.sku ?? 'empty'}`}
                              className={`flex-row items-center p-4 active:bg-slate-50 ${
                                index > 0 ? 'border-t border-slate-100' : ''
                              }`}>
                              <View
                                className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
                                  isSelected
                                    ? 'border-orange-500 bg-orange-500'
                                    : 'border-slate-300'
                                }`}>
                                {isSelected ? (
                                  <MaterialCommunityIcons name="check" size={14} color="#ffffff" />
                                ) : null}
                              </View>
                              <View className="ml-3 flex-1">
                                <Text
                                  className={`text-base font-semibold ${
                                    bin.sku ? 'text-slate-900' : 'italic text-slate-400'
                                  }`}>
                                  {bin.sku ?? 'No product assigned'}
                                </Text>
                                <Text className="mt-0.5 text-sm text-slate-500">{bin.code}</Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
            </ScrollView>

            {/* Pinned above the tab bar so the action stays reachable while the
                list scrolls, which matters most when the pick list is long. */}
            {state.status === 'ready' ? (
              <View className="border-t border-slate-200 bg-white px-6 pb-4 pt-3">
                {feedback ? (
                  <View
                    className={`mb-3 rounded-xl border p-3 ${
                      feedback.tone === 'error'
                        ? 'border-red-200 bg-red-50'
                        : 'border-emerald-200 bg-emerald-50'
                    }`}>
                    <Text
                      className={`text-sm leading-5 ${
                        feedback.tone === 'error' ? 'text-red-700' : 'text-emerald-700'
                      }`}>
                      {feedback.message}
                    </Text>
                    {feedback.tone === 'success' ? (
                      <Pressable
                        onPress={() => router.navigate('/history')}
                        accessibilityRole="button"
                        className="mt-2">
                        <Text className="text-sm font-semibold text-emerald-800">
                          View in History
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                <Pressable
                  onPress={handleCreate}
                  disabled={submitting || selected.length === 0}
                  accessibilityRole="button"
                  accessibilityLabel="Create order"
                  accessibilityState={{ disabled: submitting || selected.length === 0 }}
                  className={`h-12 flex-row items-center justify-center rounded-xl ${
                    submitting || selected.length === 0
                      ? 'bg-slate-300'
                      : 'bg-orange-500 active:bg-orange-600'
                  }`}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text
                      className={`text-base font-semibold ${
                        selected.length === 0 ? 'text-slate-500' : 'text-white'
                      }`}>
                      {selected.length === 0
                        ? 'Select bins to continue'
                        : `Create order (${selected.length})`}
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </RequireAdmin>
  );
}

/** ApiError means the backend answered; anything else never reached it. */
function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    // Spring's error body is JSON with the real reason under `message`; showing
    // the raw body would bury it in timestamps and paths.
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
