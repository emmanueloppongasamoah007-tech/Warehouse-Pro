import { memo } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { FIELD_BASE_CLASSNAME, useStableTextStyle } from './field-config';

export type EmailFieldProps = TextInputProps;

/**
 * Email TextInput tuned to stay visually stable while focused on Android.
 *
 * The relevant behaviour: Android re-measures and re-lays out a focused
 * EditText whenever its content or style is re-applied. Anything that changes
 * per keystroke - a fresh style array, a changing height, an active suggestion
 * engine - shows up as text jumping mid-type and settling on blur.
 *
 * Wrapped in memo so a parent re-render that does not change this field's props
 * does not re-render the input at all. Both auth screens hold the email value in
 * screen-level state, so every keystroke re-renders the whole screen.
 */
function EmailFieldComponent({ style, ...rest }: EmailFieldProps) {
  const stableTextStyle = useStableTextStyle();

  return (
    <TextInput
      {...rest}
      keyboardType="email-address"
      autoCapitalize="none"
      autoComplete="email"
      // The suggestion engine re-measures unrecognised text as it is typed;
      // an email address is never in the dictionary. Also simply wrong here.
      autoCorrect={false}
      spellCheck={false}
      textContentType="emailAddress"
      textAlignVertical="center"
      // Single line: multiline inputs recompute their height per keystroke.
      multiline={false}
      numberOfLines={1}
      scrollEnabled={false}
      className={`${FIELD_BASE_CLASSNAME} px-4`}
      // StyleSheet.flatten collapses to one object rather than allocating a new
      // array each render, so the style identity handed to the native view is
      // stable when `style` is unchanged.
      style={StyleSheet.flatten([stableTextStyle, style])}
    />
  );
}

export const EmailField = memo(EmailFieldComponent);
