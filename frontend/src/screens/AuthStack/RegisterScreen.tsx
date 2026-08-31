/**
 * Registration screen.
 *
 * Validates locally before submitting, then renders every field error the
 * server returns at once rather than one per attempt.
 */

import React, {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {Button, ErrorAlert, Screen, TextField} from '@components/index';
import type {FieldHintTone} from '@components/TextField';
import {useAuth} from '@hooks/useAuth';
import {useErrors} from '@hooks/useErrors';
import type {AuthStackParamList} from '@/navigation/AuthNavigator';
import {colors, spacing, typography} from '@styles/theme';
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_STRENGTH_LEVELS,
  STRONG_PASSWORD_LENGTH,
} from '@utils/constants';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const STRENGTH_LABELS = ['', 'Weak', 'Medium', 'Strong'] as const;
/** One bar per strength level: [0, 1, 2]. */
const BAR_INDEXES = Array.from(
  {length: PASSWORD_STRENGTH_LEVELS},
  (_unused, index) => index,
);

type Navigation = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

/** 0 for empty, then one level per length threshold. */
function scorePassword(password: string): number {
  if (password.length === 0) {
    return 0;
  }
  if (password.length >= STRONG_PASSWORD_LENGTH) {
    return PASSWORD_STRENGTH_LEVELS;
  }
  return password.length >= MIN_PASSWORD_LENGTH
    ? PASSWORD_STRENGTH_LEVELS - 1
    : 1;
}

/** Three bars plus a word -- the word is what carries the meaning. */
function StrengthMeter({score}: {score: number}): React.JSX.Element {
  return (
    <View style={styles.meter}>
      <View style={styles.bars}>
        {BAR_INDEXES.map(index => (
          <View
            key={index}
            style={[styles.bar, index < score ? styles.barOn : styles.barOff]}
          />
        ))}
      </View>
      <Text style={styles.strengthLabel}>{STRENGTH_LABELS[score]}</Text>
    </View>
  );
}

export function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const {register, isLoading} = useAuth();
  const {errors, fieldErrors, clearErrors} = useErrors();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const emailValid = EMAIL_PATTERN.test(email.trim());
  const score = scorePassword(password);
  const matches = password === confirmation;
  const canSubmit =
    emailValid && score >= PASSWORD_STRENGTH_LEVELS - 1 && matches;

  const emailHint =
    email.length === 0
      ? undefined
      : emailValid
        ? '✓ Looks good'
        : 'Keep typing…';
  const emailHintTone: FieldHintTone = emailValid ? 'positive' : 'neutral';

  const onSubmit = async (): Promise<void> => {
    if (!canSubmit) {
      return;
    }
    await register({email: email.trim(), password});
  };

  return (
    <Screen>
      <ErrorAlert errors={errors} onDismiss={clearErrors} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>One account, all your devices</Text>

          <View style={styles.field}>
            <TextField
              label="Email"
              testID="register-email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              error={fieldErrors.email}
              hint={emailHint}
              hintTone={emailHintTone}
            />
          </View>

          <View style={styles.field}>
            <TextField
              label="Password"
              testID="register-password"
              value={password}
              onChangeText={setPassword}
              placeholder={`${MIN_PASSWORD_LENGTH}+ characters`}
              secure
              error={fieldErrors.password}
            />
            {password.length > 0 ? <StrengthMeter score={score} /> : null}
          </View>

          <View style={styles.fieldWide}>
            <TextField
              label="Confirm password"
              testID="register-confirmation"
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="Repeat password"
              secure
              hint={
                confirmation.length === 0
                  ? undefined
                  : matches
                    ? '✓ Passwords match'
                    : "✗ Passwords don't match"
              }
              hintTone={matches ? 'positive' : 'error'}
            />
          </View>

          <Button
            label="Create account"
            onPress={onSubmit}
            disabled={!canSubmit}
            isLoading={isLoading}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.s20,
    paddingBottom: spacing.s24,
  },
  title: {
    ...typography.authTitle,
    color: colors.textPrimary,
    marginTop: spacing.s16,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginTop: spacing.s6,
    marginBottom: spacing.s28,
  },
  field: {marginBottom: spacing.s16},
  fieldWide: {marginBottom: spacing.s24},
  meter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s8,
    marginTop: spacing.s6,
  },
  bars: {flex: 1, flexDirection: 'row', gap: spacing.s4},
  bar: {flex: 1, height: spacing.s4},
  barOn: {backgroundColor: colors.primary},
  barOff: {backgroundColor: colors.neutral300},
  strengthLabel: {...typography.captionStrong, color: colors.textTertiary},
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.s16,
  },
  footerText: {...typography.body, color: colors.textSecondary},
  link: {...typography.smallStrong, color: colors.primaryDarker},
});
