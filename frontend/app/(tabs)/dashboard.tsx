import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
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
import { AisleManager } from '@/components/aisle-manager';
import { RequireAdmin } from '@/components/require-admin';
import { WarehouseMap, type Aisle, type Bin } from '@/components/warehouse-map';
import { ApiError, apiGet, apiPut } from '@/lib/client';

/** Matches backend model/Warehouse.java. */
type Warehouse = {
  id: number;
  name: string;
  width: number;
  height: number;
  updatedAt: string;
};

/** Matches backend model/Zone.java. */
type Zone = {
  id: number;
  name: string;
  zoneType: string | null;
};

/** The packing station has no aisle and is not part of the shelf grid. */
const START_CODE = 'PACK-01';

type SetupData = {
  warehouse: Warehouse;
  aisles: Aisle[];
  bins: Bin[];
  zones: Zone[];
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: SetupData };

type Feedback = { tone: 'error' | 'success'; message: string } | null;

export default function DashboardScreen() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const [name, setName] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      // Bins and aisles are fetched alongside the dimensions so the preview map
      // can show what is currently on the floor - which is also what constrains
      // how small the warehouse can be made.
      const [warehouse, aisles, bins, zones] = await Promise.all([
        apiGet<Warehouse>('/api/warehouse'),
        apiGet<Aisle[]>('/api/aisles'),
        apiGet<Bin[]>('/api/bins'),
        apiGet<Zone[]>('/api/zones'),
      ]);
      setName(warehouse.name);
      setWidth(String(warehouse.width));
      setHeight(String(warehouse.height));
      setState({ status: 'ready', data: { warehouse, aisles, bins, zones } });
    } catch (error) {
      setState({ status: 'error', message: describeError(error) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    setFeedback(null);

    const parsedWidth = Number(width);
    const parsedHeight = Number(height);

    if (!name.trim()) {
      setFeedback({ tone: 'error', message: 'Enter a warehouse name.' });
      return;
    }
    // Number('') is 0 and Number('abc') is NaN, so both are caught here rather
    // than being sent as a malformed body.
    if (!Number.isFinite(parsedWidth) || parsedWidth <= 0) {
      setFeedback({ tone: 'error', message: 'Width must be a number greater than 0.' });
      return;
    }
    if (!Number.isFinite(parsedHeight) || parsedHeight <= 0) {
      setFeedback({ tone: 'error', message: 'Height must be a number greater than 0.' });
      return;
    }

    setSaving(true);
    try {
      const updated = await apiPut<Warehouse>('/api/warehouse', {
        name: name.trim(),
        width: parsedWidth,
        height: parsedHeight,
      });
      setState((prev) =>
        prev.status === 'ready'
          ? { status: 'ready', data: { ...prev.data, warehouse: updated } }
          : prev,
      );
      setFeedback({ tone: 'success', message: 'Warehouse dimensions saved.' });
    } catch (error) {
      // The backend rejects a size that would strand existing bins and names
      // them in the message, so it is shown verbatim rather than replaced with
      // a generic failure.
      setFeedback({ tone: 'error', message: describeError(error) });
    } finally {
      setSaving(false);
    }
  }

  const warehouse = state.status === 'ready' ? state.data.warehouse : null;
  const isDirty =
    warehouse != null &&
    (name !== warehouse.name ||
      width !== String(warehouse.width) ||
      height !== String(warehouse.height));

  return (
    <RequireAdmin>
      <View className="flex-1 bg-slate-50">
        <StatusBar style="dark" />

        {/* Bottom edge is left to the tab bar, which already insets itself. */}
        <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              className="flex-1"
              contentContainerClassName="px-6 pb-10 pt-6"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Text className="text-3xl font-bold text-slate-900">Warehouse setup</Text>
              <Text className="mt-1 text-base text-slate-500">
                Floor dimensions and layout
              </Text>

              {state.status === 'loading' ? (
                <View className="mt-6 items-center rounded-2xl border border-slate-200 bg-white p-8">
                  <ActivityIndicator color="#f97316" />
                  <Text className="mt-3 text-sm text-slate-500">Loading setup...</Text>
                </View>
              ) : null}

              {state.status === 'error' ? (
                <View className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#b91c1c" />
                    <Text className="ml-2 text-base font-semibold text-red-800">
                      Could not load setup
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
                  <View className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Dimensions
                    </Text>

                    <View className="mt-4">
                      <Text className="mb-1.5 text-sm font-medium text-slate-700">Name</Text>
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        editable={!saving}
                        placeholder="e.g. Main Warehouse"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="words"
                        autoCorrect={false}
                        textAlignVertical="center"
                        className={`${FIELD_BASE_CLASSNAME} px-4`}
                        style={STABLE_TEXT_STYLE}
                      />
                    </View>

                    <View className="mt-4 flex-row gap-3">
                      <View className="flex-1">
                        <Text className="mb-1.5 text-sm font-medium text-slate-700">Width</Text>
                        <TextInput
                          value={width}
                          onChangeText={setWidth}
                          editable={!saving}
                          placeholder="40"
                          placeholderTextColor="#94a3b8"
                          // decimal-pad rather than numeric: no minus sign, and
                          // dimensions can legitimately be fractional.
                          keyboardType="decimal-pad"
                          autoCorrect={false}
                          textAlignVertical="center"
                          className={`${FIELD_BASE_CLASSNAME} px-4`}
                          style={STABLE_TEXT_STYLE}
                        />
                      </View>

                      <View className="flex-1">
                        <Text className="mb-1.5 text-sm font-medium text-slate-700">Height</Text>
                        <TextInput
                          value={height}
                          onChangeText={setHeight}
                          editable={!saving}
                          placeholder="45"
                          placeholderTextColor="#94a3b8"
                          keyboardType="decimal-pad"
                          autoCorrect={false}
                          textAlignVertical="center"
                          className={`${FIELD_BASE_CLASSNAME} px-4`}
                          style={STABLE_TEXT_STYLE}
                        />
                      </View>
                    </View>

                    <Text className="mt-2 text-xs leading-4 text-slate-500">
                      Measured in the same units as bin coordinates. The warehouse cannot be made
                      smaller than the bins already placed in it.
                    </Text>

                    {feedback ? (
                      <View
                        className={`mt-4 rounded-xl border p-3 ${
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
                      </View>
                    ) : null}

                    <Pressable
                      onPress={handleSave}
                      disabled={saving || !isDirty}
                      accessibilityRole="button"
                      accessibilityLabel="Save dimensions"
                      accessibilityState={{ disabled: saving || !isDirty }}
                      className={`mt-4 h-12 flex-row items-center justify-center rounded-xl ${
                        saving || !isDirty ? 'bg-slate-300' : 'bg-orange-500 active:bg-orange-600'
                      }`}>
                      {saving ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text
                          className={`text-base font-semibold ${
                            isDirty ? 'text-white' : 'text-slate-500'
                          }`}>
                          {isDirty ? 'Save changes' : 'Saved'}
                        </Text>
                      )}
                    </Pressable>
                  </View>

                  <View className="mt-6">
                    <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Aisles and shelves
                    </Text>
                    <AisleManager
                      aisles={state.data.aisles}
                      bins={state.data.bins}
                      zoneId={state.data.zones[0]?.id ?? null}
                      startCode={START_CODE}
                      floor={{
                        width: state.data.warehouse.width,
                        height: state.data.warehouse.height,
                      }}
                      onChanged={load}
                      onError={(message) => setFeedback({ tone: 'error', message })}
                    />
                  </View>

                  <View className="mt-6">
                    <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Current layout
                    </Text>
                    {/* No routeCodes: this is the floor plan, not a picking
                        route. `floor` is what makes a resize visible here -
                        the drawn boundary follows the saved dimensions. */}
                    <WarehouseMap
                      aisles={state.data.aisles}
                      bins={state.data.bins}
                      routeCodes={[]}
                      floor={{
                        width: state.data.warehouse.width,
                        height: state.data.warehouse.height,
                      }}
                    />

                    <View className="mt-4 flex-row gap-3">
                      <StatTile
                        icon="view-grid-outline"
                        label="Aisles"
                        value={String(state.data.aisles.length)}
                      />
                      <StatTile
                        icon="package-variant-closed"
                        label="Bins"
                        value={String(state.data.bins.length)}
                      />
                      <StatTile
                        icon="ruler-square"
                        label="Floor"
                        value={`${state.data.warehouse.width} x ${state.data.warehouse.height}`}
                      />
                    </View>
                  </View>
                </>
              ) : null}
            </ScrollView>
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

function StatTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
      {/* Icon color is a prop: @expo/vector-icons is outside NativeWind's
          interop registry, so className on an icon is a silent no-op. */}
      <MaterialCommunityIcons name={icon} size={18} color="#94a3b8" />
      <Text className="mt-2 text-lg font-bold text-slate-900">{value}</Text>
      <Text className="text-xs text-slate-500">{label}</Text>
    </View>
  );
}
