/**
 * Password reset request.
 *
 * Reports the same thing whether or not the address has an account. The server
 * deliberately does not say, and telling the user here would give away exactly
 * what the login screen refuses to.
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

import {Button, ErrorAlert, Icon, Screen, TextField} from '@components/index';
import {useErrors} from '@hooks/useErrors';
import * as authService from '@services/auth';
import type {AuthStackParamList} from '@/navigation/AuthNavigator';
import {colors, sizes, spacing, typography} from '@styles/theme';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Navigation = NativeStackNavigationProp<
  AuthStackParamList,
  'ForgotPassword'
>;

export function ForgotPasswordScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const {errors, clearErrors} = useErrors();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isSubmitting, setSubmitting] = useState(false);
  const [isSent, setSent] = useState(false);

  const onSubmit = async (): Promise<void> => {
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailError('Enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      await authService.forgotPassword(trimmed);
    } catch {
      // Swallowed on purpose: a failure here would otherwise reveal whether
      // the address exists, which is the one thing this endpoint hides.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
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
          {isSent ? (
            <View style={styles.confirmation}>
              <Icon name="check" size={sizes.iconLg} color={colors.primary} />
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                {`If ${email.trim()} has an account, a reset link is on its way. The link works once and expires in an hour.`}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>
                We'll email you a link to set a new one.
              </Text>
              <View style={styles.field}>
                <TextField
                  label="Email"
                  testID="forgot-email"
                  value={email}
                  onChangeText={value => {
                    setEmail(value);
                    setEmailError(undefined);
                  }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  error={emailError}
                />
              </View>
              <Button
                label="Send reset link"
                onPress={onSubmit}
                isLoading={isSubmitting}
              />
            </>
          )}

          <Pressable
            accessibilityRole="link"
            onPress={() => navigation.navigate('Login')}
            style={styles.back}>
            <Text style={styles.link}>Back to sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.s20,
    paddingBottom: spacing.s24,
  },
  confirmation: {gap: spacing.s12},
  title: {...typography.authTitle, color: colors.textPrimary},
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginTop: spacing.s6,
    marginBottom: spacing.s28,
  },
  field: {marginBottom: spacing.s24},
  back: {alignSelf: 'center', marginTop: spacing.s24},
  link: {...typography.smallStrong, color: colors.primaryDarker},
});
