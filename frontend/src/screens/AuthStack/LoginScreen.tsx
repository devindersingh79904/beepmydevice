/**
 * Login screen.
 *
 * VAL_* errors highlight their field inline; everything else goes to the
 * banner.
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

import {Button, ErrorAlert, Logo, Screen, TextField} from '@components/index';
import {useAuth} from '@hooks/useAuth';
import {useErrors} from '@hooks/useErrors';
import type {AuthStackParamList} from '@/navigation/AuthNavigator';
import {colors, spacing, typography} from '@styles/theme';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Navigation = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const {login} = useAuth();
  const {errors, fieldErrors, clearErrors} = useErrors();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  // Local, not the auth context's isLoading: that flag means "restoring a
  // persisted session", which is true on first mount and would leave this
  // button disabled before the user has typed anything.
  const [isSubmitting, setSubmitting] = useState(false);

  const onSubmit = async (): Promise<void> => {
    const trimmed = email.trim();
    const emailValid = EMAIL_PATTERN.test(trimmed);
    const passwordValid = password.length > 0;

    setEmailError(emailValid ? undefined : 'Enter a valid email address');
    setPasswordError(passwordValid ? undefined : 'Password is required');
    if (!emailValid || !passwordValid) {
      return;
    }

    setSubmitting(true);
    try {
      await login({email: trimmed, password});
    } finally {
      setSubmitting(false);
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
          <View style={styles.logo}>
            <Logo variant="auth" />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to reach your devices</Text>

          <View style={styles.field}>
            <TextField
              label="Email"
              testID="login-email"
              value={email}
              onChangeText={value => {
                setEmail(value);
                setEmailError(undefined);
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              error={emailError ?? fieldErrors.email}
            />
          </View>
          <TextField
            label="Password"
            testID="login-password"
            value={password}
            onChangeText={value => {
              setPassword(value);
              setPasswordError(undefined);
            }}
            placeholder="••••••••"
            secure
            error={passwordError ?? fieldErrors.password}
          />

          <Pressable
            accessibilityRole="link"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgot}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>

          <Button label="Sign in" onPress={onSubmit} isLoading={isSubmitting} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Sign up</Text>
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
  logo: {
    alignSelf: 'flex-start',
    marginTop: spacing.s24,
    marginBottom: spacing.s20,
  },
  title: {...typography.authTitle, color: colors.textPrimary},
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginTop: spacing.s6,
    marginBottom: spacing.s28,
  },
  field: {marginBottom: spacing.s16},
  forgot: {
    alignSelf: 'flex-end',
    marginTop: spacing.s8,
    marginBottom: spacing.s24,
  },
  link: {...typography.smallStrong, color: colors.primaryDarker},
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.s16,
  },
  footerText: {...typography.body, color: colors.textSecondary},
});
