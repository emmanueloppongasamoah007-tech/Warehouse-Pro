import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputProps,
  type TextInputSelectionChangeEventData,
} from 'react-native';

import { FIELD_BASE_CLASSNAME, STABLE_TEXT_STYLE } from './field-config';

export type PasswordFieldProps = Omit<TextInputProps, 'secureTextEntry'>;

type Selection = { start: number; end: number };

/**
 * Password TextInput with a show/hide eye toggle.
 *
 * Visibility is local to each instance, so a screen with several password
 * fields toggles them independently.
 *
 * Wrapped in memo for the same reason as EmailField: the auth screens hold
 * field values in screen-level state, so every keystroke re-renders the screen,
 * and re-applying props to a focused Android input causes visible jitter.
 */
function PasswordFieldComponent({
  editable = true,
  value,
  onSelectionChange,
  style,
  ...rest
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  // Controlled for exactly one frame after a toggle, then released back to
  // undefined. Leaving selection permanently controlled makes the caret jump to
  // the end on every keystroke on Android.
  const [selection, setSelection] = useState<Selection | undefined>(undefined);

  // Latest caret position. A ref rather than state so tracking it does not
  // re-render the field on every keystroke.
  const caretRef = useRef(0);

  function handleSelectionChange(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) {
    caretRef.current = event.nativeEvent.selection.end;
    onSelectionChange?.(event);
  }

  function toggleVisibility() {
    // Re-asserting the caret forces the input to scroll that position back into
    // view, which clears any stale offset left over from the masked state.
    const caret = Math.min(caretRef.current, value?.length ?? 0);
    setSelection({ start: caret, end: caret });
    setVisible((current) => !current);
  }

  useEffect(() => {
    if (!selection) return;
    // Hand control back once the toggle has been painted.
    const frame = requestAnimationFrame(() => setSelection(undefined));
    return () => cancelAnimationFrame(frame);
  }, [selection]);

  return (
    // The input owns the border; the toggle sits inside it as a sibling so the
    // eye never overlaps typed text (pr-12 reserves the space).
    <View className="relative justify-center">
      <TextInput
        {...rest}
        value={value}
        editable={editable}
        secureTextEntry={!visible}
        selection={selection}
        onSelectionChange={handleSelectionChange}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        // Keeps the caret vertically centred on Android, where the typeface
        // swap can otherwise nudge the baseline.
        textAlignVertical="center"
        multiline={false}
        numberOfLines={1}
        scrollEnabled={false}
        className={`${FIELD_BASE_CLASSNAME} pl-4 pr-12`}
        // Flattened rather than an array literal: a new style identity each
        // render makes React Native re-apply style to the focused EditText.
        style={StyleSheet.flatten([STABLE_TEXT_STYLE, style])}
      />

      <Pressable
        onPress={toggleVisibility}
        disabled={!editable}
        // Enlarges the touch target beyond the icon's own bounds without
        // affecting layout; the raw glyph is below the ~44pt minimum.
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 p-1">
        {/* Icon color is a prop: @expo/vector-icons is not in NativeWind v4's
            interop registry, so className on an icon is a silent no-op. */}
        <MaterialCommunityIcons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={22}
          color={editable ? '#64748b' : '#cbd5e1'}
        />
      </Pressable>
    </View>
  );
}

export const PasswordField = memo(PasswordFieldComponent);
