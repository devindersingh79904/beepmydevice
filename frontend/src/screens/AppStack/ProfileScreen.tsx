/** Profile: email and password change. */

import React, {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Avatar,
  Button,
  ErrorAlert,
  Screen,
  ScreenHeader,
  SectionLabel,
  SettingsSectionHeader,
  TextField,
  Toast,
} from '@components/index';
import {useAuth} from '@hooks/useAuth';
import {useErrors} from '@hooks/useErrors';
import {useToast} from '@hooks/useToast';
import type {AppStackParamList} from '@/navigation/AppNavigator';
import {colors, spacing, typography} from '@styles/theme';
import {MIN_PASSWORD_LENGTH} from '@utils/constants';
import {formatDate} from '@utils/helpers';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Profile'>;

export function ProfileScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const {user} = useAuth();
  const {errors, fieldErrors, clearErrors} = useErrors();
  const {toast, showToast, dismissToast} = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const matches = newPassword === confirmation;
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    matches;

  // The change-password endpoint is not in `API_ROUTES` yet, so this screen
  // renders the form the canvas specifies and reports the gap rather than
  // pretending to save.
  const onSubmit = (): void => {
    showToast('info', 'Password changes are not available yet');
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Profile" onBack={navigation.goBack} />
      <View style={styles.body}>
        <ErrorAlert errors={errors} onDismiss={clearErrors} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <SettingsSectionHeader>ACCOUNT</SettingsSectionHeader>
            <View style={styles.identity}>
              <Avatar name={user?.email ?? 'Account'} size="large" />
              <View style={styles.identityText}>
                <Text style={styles.email}>{user?.email ?? 'Signed in'}</Text>
                <Text style={styles.meta}>
                  {`Member since ${formatDate(user?.created_at ?? null)}`}
                </Text>
              </View>
            </View>

            <SettingsSectionHeader>CHANGE PASSWORD</SettingsSectionHeader>
            <View style={styles.form}>
              <SectionLabel>NEW CREDENTIALS</SectionLabel>
              <View style={styles.field}>
                <TextField
                  label="Current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="••••••••"
                  secure
                  error={fieldErrors.current_password}
                />
              </View>
              <View style={styles.field}>
                <TextField
                  label="New password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={`${MIN_PASSWORD_LENGTH}+ characters`}
                  secure
                  error={fieldErrors.password}
                />
              </View>
              <View style={styles.field}>
                <TextField
                  label="Confirm new password"
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
                label="Update password"
                onPress={onSubmit}
                disabled={!canSubmit}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <Toast toast={toast} onDismiss={dismissToast} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  body: {flex: 1},
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s12,
    padding: spacing.s16,
  },
  identityText: {flex: 1},
  email: {...typography.listTitle, color: colors.textPrimary},
  meta: {...typography.small, color: colors.textSecondary},
  form: {padding: spacing.s16},
  field: {marginBottom: spacing.s16},
});
