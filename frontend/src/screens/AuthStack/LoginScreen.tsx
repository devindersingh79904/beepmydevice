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

import {Button, ErrorAlert, Icon, Screen, TextField} from '@components/index';
import {useAuth} from '@hooks/useAuth';
import {useErrors} from '@hooks/useErrors';
import type {AuthStackParamList} from '@/navigation/AuthNavigator';
import {colors, radius, sizes, spacing, typography} from '@styles/theme';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Navigation = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const {login, isLoading} = useAuth();
  const {errors, fieldErrors, clearErrors} = useErrors();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const onSubmit = async (): Promise<void> => {
    const trimmed = email.trim();
    const emailValid = EMAIL_PATTERN.test(trimmed);
    const passwordValid = password.length > 0;

    setEmailError(emailValid ? undefined : 'Enter a valid email address');
    setPasswordError(passwordValid ? undefined : 'Password is required');
    if (!emailValid || !passwordValid) {
      return;
    }

    await login({email: trimmed, password});
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
            <Icon
              name="wifi"
              size={sizes.authLogoIcon}
              color={colors.textInverse}
            />
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

          {/* The canvas shows this link but specifies no reset flow, and the
              auth stack has no screen for one yet. Kept in place so the layout
              matches; wire it up when the flow is designed. */}
          <Pressable
            accessibilityRole="link"
            onPress={() => undefined}
            style={styles.forgot}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>

          <Button label="Sign in" onPress={onSubmit} isLoading={isLoading} />

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
    width: sizes.authLogo,
    height: sizes.authLogo,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.none,
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
