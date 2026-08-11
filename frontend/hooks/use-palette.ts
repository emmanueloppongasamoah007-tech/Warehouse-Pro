import { useColorScheme } from 'nativewind';

import { Palette } from '@/constants/palette';

/**
 * The active color scheme's prop-color tokens.
 *
 * For colors passed as props - icons, ActivityIndicator, placeholderTextColor,
 * SVG fills - where a `dark:` class does nothing. Everything stylable by class
 * should stay a class.
 *
 * Imported from `nativewind` rather than `@/hooks/use-color-scheme`: the latter
 * re-exports React Native's hook, which reflects the device setting. This one
 * also sees a manual override set from Settings, so the two can disagree.
 */
export function usePalette() {
  const { colorScheme } = useColorScheme();
  return Palette[colorScheme === 'dark' ? 'dark' : 'light'];
}
