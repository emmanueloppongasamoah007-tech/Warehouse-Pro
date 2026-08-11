import { useColorScheme } from 'nativewind';
import { type TextStyle } from 'react-native';

/**
 * Shared text-input configuration for the auth forms.
 *
 * These settings exist to keep Android text metrics stable. Android re-measures
 * an input's text as you type, and several defaults make that measurement move:
 * the result is text that appears to jump, drift vertically, or scroll out of
 * view mid-edit. Keeping the values in one module stops the fields from drifting
 * apart as new ones are added.
 */

/**
 * Fixed row height, replacing vertical padding.
 *
 * This is the important one. With `py-3` the input's height was derived from the
 * measured height of its current text, so the height changed as the glyphs
 * changed - typing a descender (g, y, p, j) or a tall glyph (@) re-measured the
 * content and nudged the row, which reads as letters dropping while you type.
 * A fixed height cannot be re-measured, so the row is stable no matter what is
 * typed, and `textAlignVertical` centres the text within it.
 *
 * h-12 (48px) matches the previous rendered height of py-3 + text-base, so this
 * is not a visual change.
 */
export const FIELD_BASE_CLASSNAME =
  'h-12 rounded-xl border border-slate-300 bg-white text-base text-slate-900 ' +
  'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

/**
 * `includeFontPadding` is an Android-only default that reserves fixed space for
 * ascenders and descenders. Disabling it makes the measured text height depend
 * on which glyphs are present, which is only safe now that the row height is
 * fixed above; it buys more predictable vertical centring within that row.
 *
 * `color` is pinned here rather than relying on `text-slate-900` in the
 * NativeWind class. On Android, a NativeWind class mapping to `style.color` can
 * lose to the platform's own secure-text rendering, so the dots render white on
 * the white background. An explicit style property wins.
 *
 * That same override is why dark mode needs a second object rather than a
 * `dark:` class: the class is exactly what gets overridden here.
 *
 * Two frozen constants, not one built per render. A fresh array or object each
 * keystroke makes React Native re-apply style to the underlying EditText, and
 * re-applying style to a focused Android input is itself a source of visible
 * jitter - so the style identity has to stay stable for a given scheme.
 */
const STABLE_TEXT_STYLE_LIGHT: TextStyle = Object.freeze({
  includeFontPadding: false,
  color: '#0f172a', // text-slate-900
});

const STABLE_TEXT_STYLE_DARK: TextStyle = Object.freeze({
  includeFontPadding: false,
  color: '#f1f5f9', // text-slate-100
});

/** The scheme's frozen input text style. Returns one of two stable identities. */
export function useStableTextStyle(): TextStyle {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? STABLE_TEXT_STYLE_DARK : STABLE_TEXT_STYLE_LIGHT;
}
