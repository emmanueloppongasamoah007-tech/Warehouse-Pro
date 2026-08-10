import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FIELD_BASE_CLASSNAME, STABLE_TEXT_STYLE } from '@/components/field-config';
import { type Aisle, type Bin } from '@/components/warehouse-map';
import { filterBins, groupBinsByAisle, type BinGroup } from '@/lib/bin-search';
import { ApiError, apiGet } from '@/lib/client';

type InventoryData = {
  bins: Bin[];
  aisles: Aisle[];
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: InventoryData };

// Read-only lookup. Products are assigned on the admin Dashboard, alongside the
// aisle and shelf they belong to.
export default function InventoryScreen() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [query, setQuery] = useState('');

  const loadInventory = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      // /api/bins is the source of truth for stock locations: it returns every
      // bin, including ones with no aisle. /api/aisles is fetched alongside it
      // purely for the aisle names, since BinLocation.aisle is @JsonIgnore'd and
      // so a bin arrives with no aisle information of its own.
      const [bins, aisles] = await Promise.all([
        apiGet<Bin[]>('/api/bins'),
        apiGet<Aisle[]>('/api/aisles'),
      ]);
      setState({ status: 'ready', data: { bins, aisles } });
    } catch (error) {
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

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const bins = state.status === 'ready' ? state.data.bins : [];
  const aisles = state.status === 'ready' ? state.data.aisles : [];

  const matches = useMemo(() => filterBins(bins, query), [bins, query]);

  // Grouped by aisle rather than repeating the aisle on every row.
  const groups = useMemo<BinGroup[]>(() => groupBinsByAisle(aisles, matches), [aisles, matches]);

  const isSearching = query.trim().length > 0;

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />

      {/* Bottom edge is left to the tab bar, which already insets itself. */}
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        {/* Header and search sit outside the ScrollView so the search field
            stays put while results scroll under it. */}
        <View className="px-6 pb-3 pt-6">
          <Text className="text-3xl font-bold text-slate-900">Inventory</Text>
          <Text className="mt-1 text-base text-slate-500">
            {state.status === 'ready'
              ? isSearching
                ? `${matches.length} of ${bins.length} ${bins.length === 1 ? 'location' : 'locations'}`
                : `${bins.length} ${bins.length === 1 ? 'location' : 'locations'}`
              : 'Search by product or bin code'}
          </Text>

          <View className="relative mt-4 justify-center">
            {/* Icon colors are props: @expo/vector-icons is outside NativeWind's
                interop registry, so className on an icon is a silent no-op. */}
            <View className="absolute left-3 z-10">
              <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
            </View>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search product or bin code"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              // Same Android text-stability settings as the auth fields: the
              // suggestion engine re-measures unrecognised text as it is typed,
              // which makes the value visibly shift mid-edit.
              autoCorrect={false}
              spellCheck={false}
              textAlignVertical="center"
              multiline={false}
              returnKeyType="search"
              clearButtonMode="never"
              className={`${FIELD_BASE_CLASSNAME} pl-10 pr-10`}
              style={STABLE_TEXT_STYLE}
            />

            {isSearching ? (
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
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-10 pt-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {state.status === 'loading' ? (
            <View className="mt-6 items-center rounded-2xl border border-slate-200 bg-white p-8">
              <ActivityIndicator color="#f97316" />
              <Text className="mt-3 text-sm text-slate-500">Loading inventory...</Text>
            </View>
          ) : null}

          {state.status === 'error' ? (
            <View className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-5">
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#b91c1c" />
                <Text className="ml-2 text-base font-semibold text-red-800">
                  Could not load inventory
                </Text>
              </View>
              <Text className="mt-2 text-sm leading-5 text-red-700">{state.message}</Text>
              <Pressable
                onPress={loadInventory}
                accessibilityRole="button"
                accessibilityLabel="Retry"
                className="mt-4 h-11 flex-row items-center justify-center rounded-full bg-red-600 active:bg-red-700">
                <MaterialCommunityIcons name="refresh" size={18} color="#ffffff" />
                <Text className="ml-2 text-base font-semibold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {state.status === 'ready' && groups.length === 0 ? (
            <View className="mt-6 items-center rounded-2xl border border-slate-200 bg-white p-8">
              <MaterialCommunityIcons
                name={isSearching ? 'magnify-close' : 'archive-outline'}
                size={40}
                color="#cbd5e1"
              />
              <Text className="mt-3 text-base font-semibold text-slate-900">
                {isSearching ? 'No matches' : 'No bin locations yet'}
              </Text>
              <Text className="mt-1 text-center text-sm text-slate-500">
                {isSearching
                  ? `Nothing matches "${query.trim()}". Try a product name or bin code.`
                  : 'Bin locations configured on the backend will appear here.'}
              </Text>
            </View>
          ) : null}

          {state.status === 'ready'
            ? groups.map((group) => (
                <View key={group.name} className="mt-5">
                  <View className="mb-2 flex-row items-center">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {group.name}
                    </Text>
                    <Text className="ml-2 text-xs text-slate-400">
                      {group.bins.length} {group.bins.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>

                  <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {group.bins.map((bin, index) => (
                      <View
                        key={bin.id}
                        className={`flex-row items-center p-4 ${
                          index > 0 ? 'border-t border-slate-100' : ''
                        }`}>
                        <View className="h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                          <MaterialCommunityIcons
                            name="package-variant-closed"
                            size={20}
                            color="#ea580c"
                          />
                        </View>

                        <View className="ml-3 flex-1">
                          {/* SKU leads: a picker scans for the product, then
                              reads the code to find where it lives. */}
                          <Text
                            className={`text-base font-semibold ${
                              bin.sku ? 'text-slate-900' : 'italic text-slate-400'
                            }`}>
                            {bin.sku ?? 'No product assigned'}
                          </Text>
                          <Text className="mt-0.5 text-sm text-slate-500">{bin.code}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
