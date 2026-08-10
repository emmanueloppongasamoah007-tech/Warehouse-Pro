import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import { FIELD_BASE_CLASSNAME, STABLE_TEXT_STYLE } from '@/components/field-config';
import { ProductEditor } from '@/components/product-editor';
import { type Aisle, type Bin } from '@/components/warehouse-map';
import { apiDelete, apiPost } from '@/lib/client';
import {
  nextAislePlacement,
  nextShelfSlot,
  shelfCode,
  shelfYs,
  suggestAisleName,
} from '@/lib/layout-planner';

type AisleManagerProps = {
  aisles: Aisle[];
  bins: Bin[];
  zoneId: number | null;
  startCode: string;
  /** Warehouse floor, so new shelves cannot be placed outside it. */
  floor?: { width: number; height: number };
  /** Re-fetches the layout after any change, so the map and list stay truthful. */
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

const MAX_SHELVES = 50;

export function AisleManager({
  aisles,
  bins,
  zoneId,
  startCode,
  floor,
  onChanged,
  onError,
}: AisleManagerProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newShelfCount, setNewShelfCount] = useState('4');
  const [busy, setBusy] = useState<string | null>(null);
  // Which shelf row is showing its product editor. One at a time, so the list
  // stays readable and there is no ambiguity about what a save applies to.
  const [editingBinId, setEditingBinId] = useState<number | null>(null);

  const placement = nextAislePlacement(aisles, bins, startCode);

  function openAddForm() {
    setNewName(suggestAisleName(aisles));
    setNewShelfCount('4');
    setAdding(true);
  }

  async function handleAddAisle() {
    const name = newName.trim();
    const count = Number(newShelfCount);

    if (!name) {
      onError('Enter an aisle name.');
      return;
    }
    if (aisles.some((aisle) => aisle.name.trim().toLowerCase() === name.toLowerCase())) {
      onError(`An aisle named ${name} already exists.`);
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > MAX_SHELVES) {
      onError(`Shelves must be a whole number between 1 and ${MAX_SHELVES}.`);
      return;
    }
    if (zoneId == null) {
      onError('No zone exists yet, so an aisle cannot be created.');
      return;
    }

    const ys = shelfYs(count, placement.firstShelfY, placement.shelfSpacing);
    const topY = ys[ys.length - 1];
    if (floor && (placement.x > floor.width || topY > floor.height)) {
      onError(
        `${name} would need x ${placement.x} and reach y ${topY}, outside the ${floor.width} x ` +
          `${floor.height} floor. Increase the warehouse size or use fewer shelves.`,
      );
      return;
    }

    setBusy('add-aisle');
    try {
      // The aisle first, because each bin needs its id. An aisle with no bins
      // is invisible on the map, so the shelves follow immediately.
      const created = await apiPost<Aisle>('/api/aisles', {
        name,
        orientation: 'VERTICAL',
        position: placement.position,
        startPos: 0,
        endPos: Math.max(1, Math.round(topY)),
        zoneId,
      });

      // Sequential rather than Promise.all: bin codes are unique, and a partial
      // failure is easier to reason about when the order is deterministic.
      for (let index = 0; index < ys.length; index += 1) {
        await apiPost<Bin>('/api/bins', {
          code: shelfCode(name, index + 1),
          x: placement.x,
          y: ys[index],
          sku: null,
          aisleId: created.id,
        });
      }

      setAdding(false);
      await onChanged();
    } catch (error) {
      onError(describeError(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleAddShelf(aisle: Aisle) {
    const x = aisle.bins.length > 0 ? aisle.bins[0].x : placement.x;
    // Lowest free slot, so deleting a shelf frees a gap the next add refills.
    // Extending past the last shelf every time would walk the aisle out of the
    // warehouse after a few deletes.
    const { y, slot } = nextShelfSlot(aisle, placement.firstShelfY, placement.shelfSpacing);

    if (floor && (y > floor.height || x > floor.width)) {
      onError(
        `A new shelf would sit at y ${y}, outside the ${floor.width} x ${floor.height} floor. ` +
          `Increase the warehouse height or remove a shelf first.`,
      );
      return;
    }

    // Code follows the slot, not a running count, so a refilled gap reuses its
    // old code instead of skipping numbers.
    const code = shelfCode(aisle.name.trim(), slot);
    if (bins.some((bin) => bin.code === code)) {
      onError(`${code} already exists. Rename or remove it first.`);
      return;
    }

    setBusy(`shelf-${aisle.id}`);
    try {
      await apiPost<Bin>('/api/bins', { code, x, y, sku: null, aisleId: aisle.id });
      await onChanged();
    } catch (error) {
      onError(describeError(error));
    } finally {
      setBusy(null);
    }
  }

  function confirmDeleteAisle(aisle: Aisle) {
    Alert.alert(
      `Delete ${aisle.name}?`,
      `This removes the aisle and its ${aisle.bins.length} ${
        aisle.bins.length === 1 ? 'shelf' : 'shelves'
      }. Orders that reference those bins will no longer resolve.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteAisle(aisle) },
      ],
    );
  }

  async function handleDeleteAisle(aisle: Aisle) {
    setBusy(`delete-${aisle.id}`);
    try {
      // Bins first: the aisle delete would otherwise fail on the foreign key,
      // and deleting them here keeps the codes free for reuse.
      for (const bin of aisle.bins) {
        await apiDelete(`/api/bins/${bin.id}`);
      }
      await apiDelete(`/api/aisles/${aisle.id}`);
      await onChanged();
    } catch (error) {
      onError(describeError(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteShelf(bin: Bin) {
    setBusy(`bin-${bin.id}`);
    try {
      await apiDelete(`/api/bins/${bin.id}`);
      await onChanged();
    } catch (error) {
      onError(describeError(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View>
      {aisles.length === 0 ? (
        <View className="items-center rounded-2xl border border-slate-200 bg-white p-8">
          <MaterialCommunityIcons name="view-grid-outline" size={40} color="#cbd5e1" />
          <Text className="mt-3 text-base font-semibold text-slate-900">No aisles yet</Text>
          <Text className="mt-1 text-center text-sm text-slate-500">
            Add your first aisle to start building the warehouse layout.
          </Text>
        </View>
      ) : null}

      {aisles.map((aisle) => {
        const sortedBins = [...aisle.bins].sort((a, b) => a.code.localeCompare(b.code));
        const isDeleting = busy === `delete-${aisle.id}`;

        return (
          <View
            key={aisle.id}
            className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <View className="flex-row items-center border-b border-slate-100 p-4">
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <MaterialCommunityIcons name="view-grid-outline" size={20} color="#475569" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-slate-900">{aisle.name}</Text>
                <Text className="text-xs text-slate-500">
                  {aisle.bins.length} {aisle.bins.length === 1 ? 'shelf' : 'shelves'}
                  {aisle.bins.length > 0 ? ` · x ${aisle.bins[0].x}` : ''}
                </Text>
              </View>

              <Pressable
                onPress={() => confirmDeleteAisle(aisle)}
                disabled={busy !== null}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Delete aisle ${aisle.name}`}
                className="p-2">
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="#dc2626" />
                )}
              </Pressable>
            </View>

            {sortedBins.map((bin) =>
              editingBinId === bin.id ? (
                <View key={bin.id} className="border-b border-slate-50">
                  <ProductEditor
                    bin={bin}
                    aisleId={aisle.id}
                    onSaved={async () => {
                      setEditingBinId(null);
                      await onChanged();
                    }}
                    onCancel={() => setEditingBinId(null)}
                    onError={onError}
                  />
                </View>
              ) : (
                <Pressable
                  key={bin.id}
                  onPress={() => setEditingBinId(bin.id)}
                  disabled={busy !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit product for ${bin.code}, currently ${
                    bin.sku ?? 'empty'
                  }`}
                  className="flex-row items-center border-b border-slate-50 px-4 py-2.5 active:bg-slate-50">
                  <MaterialCommunityIcons name="tray" size={16} color="#94a3b8" />
                  <Text className="ml-2 text-sm font-medium text-slate-700">{bin.code}</Text>
                  {/* Product name leads the free space: it is the field being
                      edited here, and the one that is blank on a new shelf. */}
                  <Text
                    className={`ml-3 flex-1 text-xs ${
                      bin.sku ? 'text-slate-600' : 'italic text-slate-400'
                    }`}
                    numberOfLines={1}>
                    {bin.sku ?? 'Tap to add product'}
                  </Text>
                  <MaterialCommunityIcons name="pencil-outline" size={14} color="#cbd5e1" />

                  <Pressable
                    onPress={() => handleDeleteShelf(bin)}
                    disabled={busy !== null}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete shelf ${bin.code}`}
                    className="ml-3">
                    {busy === `bin-${bin.id}` ? (
                      <ActivityIndicator size="small" color="#94a3b8" />
                    ) : (
                      <MaterialCommunityIcons name="close" size={16} color="#cbd5e1" />
                    )}
                  </Pressable>
                </Pressable>
              ),
            )}

            <Pressable
              onPress={() => handleAddShelf(aisle)}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel={`Add shelf to ${aisle.name}`}
              className="flex-row items-center justify-center py-3 active:bg-slate-50">
              {busy === `shelf-${aisle.id}` ? (
                <ActivityIndicator size="small" color="#ea580c" />
              ) : (
                <>
                  <MaterialCommunityIcons name="plus" size={16} color="#ea580c" />
                  <Text className="ml-1 text-sm font-semibold text-orange-600">Add shelf</Text>
                </>
              )}
            </Pressable>
          </View>
        );
      })}

      {adding ? (
        <View className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <Text className="text-sm font-semibold text-slate-900">New aisle</Text>

          <View className="mt-3">
            <Text className="mb-1.5 text-xs font-medium text-slate-600">Name</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. A4"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              autoCorrect={false}
              textAlignVertical="center"
              className={`${FIELD_BASE_CLASSNAME} px-4`}
              style={STABLE_TEXT_STYLE}
            />
          </View>

          <View className="mt-3">
            <Text className="mb-1.5 text-xs font-medium text-slate-600">Number of shelves</Text>
            <TextInput
              value={newShelfCount}
              onChangeText={setNewShelfCount}
              placeholder="4"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              autoCorrect={false}
              textAlignVertical="center"
              className={`${FIELD_BASE_CLASSNAME} px-4`}
              style={STABLE_TEXT_STYLE}
            />
          </View>

          <Text className="mt-2 text-xs leading-4 text-slate-500">
            Placed at x {placement.x}, shelves every {placement.shelfSpacing} units from y{' '}
            {placement.firstShelfY}. Spacing follows the aisles you already have.
          </Text>

          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={() => setAdding(false)}
              disabled={busy !== null}
              accessibilityRole="button"
              className="h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white active:bg-slate-100">
              <Text className="text-sm font-semibold text-slate-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleAddAisle}
              disabled={busy !== null}
              accessibilityRole="button"
              className={`h-11 flex-1 items-center justify-center rounded-xl ${
                busy === 'add-aisle' ? 'bg-orange-300' : 'bg-orange-500 active:bg-orange-600'
              }`}>
              {busy === 'add-aisle' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-sm font-semibold text-white">Create aisle</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={openAddForm}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel="Add aisle"
          className="h-12 flex-row items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white active:bg-slate-50">
          <MaterialCommunityIcons name="plus" size={18} color="#ea580c" />
          <Text className="ml-1.5 text-sm font-semibold text-orange-600">Add aisle</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Pulls Spring's `message` out of an error body; falls back to the raw text. */
function describeError(error: unknown): string {
  if (error instanceof Error && 'body' in error && typeof error.body === 'string') {
    try {
      const parsed = JSON.parse(error.body) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      // Not JSON - fall through.
    }
  }
  return error instanceof Error ? error.message : 'Unknown error.';
}
