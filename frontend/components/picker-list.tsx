import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { usePalette } from '@/hooks/use-palette';
import { ApiError } from '@/lib/client';
import { fetchAppUsers, type AppUser } from '@/lib/users';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; pickers: AppUser[] };

/**
 * Roster of picker profiles, for the admin Settings screen.
 *
 * Reads the backend users table rather than Supabase: listing other people's
 * accounts needs admin credentials against the auth API, whereas this table
 * exists precisely so the app can show a directory without them.
 */
export function PickerList() {
  const palette = usePalette();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const pickers = await fetchAppUsers('picker');
      setState({ status: 'ready', pickers });
    } catch (error) {
      setState({ status: 'error', message: describeError(error) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <View className="items-center py-6">
        <ActivityIndicator color={palette.strong} size="small" />
        <Text className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading pickers…</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View>
        <Text className="text-sm leading-5 text-red-700 dark:text-red-400">{state.message}</Text>
        <Pressable
          onPress={load}
          accessibilityRole="button"
          accessibilityLabel="Retry loading pickers"
          className="mt-3 h-10 items-center justify-center rounded-xl bg-red-600 active:opacity-90">
          <Text className="text-sm font-semibold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (state.pickers.length === 0) {
    return (
      <View className="items-center py-6">
        <MaterialCommunityIcons name="account-off-outline" size={32} color={palette.faint} />
        <Text className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
          No pickers yet
        </Text>
        <Text className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          Profiles appear here once someone signs up.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {state.pickers.length} {state.pickers.length === 1 ? 'Picker' : 'Pickers'}
      </Text>

      {state.pickers.map((picker, index) => (
        <View
          key={picker.id}
          className={`flex-row items-center pt-3 ${
            index > 0 ? 'mt-3 border-t border-slate-100 dark:border-slate-800' : ''
          }`}>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/20">
            <Text className="text-sm font-bold text-sky-700 dark:text-sky-300">
              {initialOf(picker.name)}
            </Text>
          </View>

          <View className="ml-3 flex-1">
            <Text
              className="text-base font-medium text-slate-900 dark:text-slate-100"
              numberOfLines={1}>
              {picker.name}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
              {picker.email}
            </Text>
          </View>

          {picker.employeeId ? (
            <Text className="ml-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              {picker.employeeId}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** First letter of the name, for the avatar circle. */
function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : '?';
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
