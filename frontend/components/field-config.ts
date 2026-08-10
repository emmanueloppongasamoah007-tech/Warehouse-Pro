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
  'h-12 rounded-xl border border-slate-300 bg-white text-base text-slate-900';

/**
 * `includeFontPadding` is an Android-only default that reserves fixed space for
 * ascenders and descenders. Disabling it makes the measured text height depend
 * on which glyphs are present, which is only safe now that the row height is
 * fixed above; it buys more predictable vertical centring within that row.
 *
 * A single frozen object, so the style identity passed to the native view never
 * changes between renders. A fresh array or object each keystroke makes React
 * Native re-apply style to the underlying EditText, and re-applying style to a
 * focused Android input is itself a source of visible jitter.
 */
export const STABLE_TEXT_STYLE: TextStyle = Object.freeze({
  includeFontPadding: false,
});
