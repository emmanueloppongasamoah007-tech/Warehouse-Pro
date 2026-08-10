import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { FIELD_BASE_CLASSNAME, STABLE_TEXT_STYLE } from '@/components/field-config';
import { type Bin } from '@/components/warehouse-map';
import { apiPut } from '@/lib/client';

type ProductEditorProps = {
  bin: Bin;
  /**
   * The aisle this bin belongs to, or null for a packing station.
   *
   * Passed in rather than read off the bin: BinLocation.aisle is @JsonIgnore'd,
   * so /api/bins never returns it. The caller knows it from the aisle grouping.
   */
  aisleId: number | null;
  /** Re-fetches after a save so the list and map reflect the change. */
  onSaved: () => Promise<void>;
  onCancel: () => void;
  onError: (message: string) => void;
};

/**
 * Inline editor for a bin's product name.
 *
 * PUT /api/bins/{id} replaces the whole record - BinLocationController reads
 * code, x, y, sku and aisleId from the body and writes all of them, and an
 * absent aisleId explicitly sets the aisle to null. Sending only the sku would
 * blank the coordinates and unlink the bin from its aisle, so every field is
 * echoed back unchanged.
 */
export function ProductEditor({ bin, aisleId, onSaved, onCancel, onError }: ProductEditorProps) {
  const [value, setValue] = useState(bin.sku ?? '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Opening the editor should put the cursor in it; tapping a row to edit and
  // then having to tap again to type is a wasted interaction.
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  async function handleSave() {
    const trimmed = value.trim();
    // Empty clears the product rather than storing "", so an emptied bin reads
    // as unassigned everywhere instead of showing a blank name.
    const sku = trimmed.length > 0 ? trimmed : null;

    if (sku === (bin.sku ?? null)) {
      onCancel();
      return;
    }

    setSaving(true);
    try {
      await apiPut<Bin>(`/api/bins/${bin.id}`, {
        code: bin.code,
        x: bin.x,
        y: bin.y,
        sku,
        aisleId,
      });
      await onSaved();
    } catch (error) {
      onError(describeError(error));
      setSaving(false);
    }
  }

  return (
    <View className="flex-row items-center p-4">
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={setValue}
        editable={!saving}
        placeholder="Product name"
        placeholderTextColor="#94a3b8"
        autoCapitalize="words"
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="center"
        returnKeyType="done"
        onSubmitEditing={handleSave}
        className={`${FIELD_BASE_CLASSNAME} flex-1 px-3`}
        style={STABLE_TEXT_STYLE}
      />

      <Pressable
        onPress={handleSave}
        disabled={saving}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Save product for ${bin.code}`}
        className="ml-2 h-12 w-12 items-center justify-center rounded-xl bg-orange-500 active:bg-orange-600">
        {saving ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <MaterialCommunityIcons name="check" size={20} color="#ffffff" />
        )}
      </Pressable>

      <Pressable
        onPress={onCancel}
        disabled={saving}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        className="ml-1 h-12 w-10 items-center justify-center">
        <MaterialCommunityIcons name="close" size={20} color="#94a3b8" />
      </Pressable>
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
