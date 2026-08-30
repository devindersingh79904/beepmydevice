/**
 * Labelled text input.
 *
 * Owns the whole field: label, box, the SHOW/HIDE affordance on secure fields,
 * and the message slot underneath. Screens pass an `error` (which also reddens
 * -- accents -- the border) or a neutral `hint`, never both, so a field can
 * never show a validation failure and a "looks good" message at once.
 */

import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import type {KeyboardTypeOptions} from 'react-native';

import {
  borderWidth,
  colors,
  radius,
  sizes,
  spacing,
  typography,
} from '@styles/theme';

export type FieldHintTone = 'neutral' | 'positive' | 'error';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Renders SHOW/HIDE and masks the value. */
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Validation failure. Accents the border and prints below, prefixed "✗". */
  error?: string;
  /** Non-error message below the field, e.g. "✓ Available". */
  hint?: string;
  hintTone?: FieldHintTone;
  testID?: string;
}

const HINT_COLORS: Record<FieldHintTone, string> = {
  neutral: colors.textSecondary,
  positive: colors.textTertiary,
  error: colors.errorText,
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboardType,
  autoCapitalize = 'none',
  error,
  hint,
  hintTone = 'neutral',
  testID,
}: TextFieldProps): React.JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const hasError = error !== undefined && error.length > 0;
  const borderColor = hasError
    ? colors.primary
    : isFocused
      ? colors.primary
      : colors.divider;

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, {borderColor}]}>
        <TextInput
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          secureTextEntry={secure && !isRevealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={label}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isRevealed ? 'Hide password' : 'Show password'}
            onPress={() => setIsRevealed(current => !current)}
            style={styles.reveal}>
            <Text style={styles.revealLabel}>
              {isRevealed ? 'HIDE' : 'SHOW'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {hasError ? (
        <Text style={[styles.message, {color: colors.errorText}]}>
          {`✗ ${error}`}
        </Text>
      ) : hint !== undefined && hint.length > 0 ? (
        <Text style={[styles.message, {color: HINT_COLORS[hintTone]}]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.s4,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: sizes.inputHeight,
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderRadius: radius.none,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    paddingHorizontal: spacing.s10,
    paddingVertical: spacing.s6,
  },
  reveal: {
    paddingHorizontal: spacing.s12,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  revealLabel: {
    ...typography.captionStrong,
    color: colors.textSecondary,
  },
  message: {
    ...typography.captionStrong,
    marginTop: spacing.s4,
  },
});
