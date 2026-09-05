/** Settings: account, current WiFi network, device management, logout. */

import React, {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {
  Avatar,
  Button,
  ConfirmDialog,
  ErrorAlert,
  Icon,
  Screen,
  ScreenHeader,
  SettingsRow,
  SettingsSectionHeader,
  Toast,
  Toggle,
} from '@components/index';
import {useAuth} from '@hooks/useAuth';
import {useDevices} from '@hooks/useDevices';
import {useErrors} from '@hooks/useErrors';
import {usePreferences} from '@hooks/usePreferences';
import {useToast} from '@hooks/useToast';
import type {AppStackParamList} from '@/navigation/AppNavigator';
import {borderWidth, colors, spacing, typography} from '@styles/theme';
import {APP_VERSION} from '@utils/constants';
import {getDeviceTypeLabel} from '@utils/helpers';
import type {Device} from '@/types/device';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Settings'>;

/** One guest, with the action that removes it from the network. */
function GuestRow({
  guest,
  onRemove,
}: {
  guest: Device;
  onRemove: (deviceId: string) => void;
}): React.JSX.Element {
  const name = guest.device_name ?? getDeviceTypeLabel(guest.device_type);

  return (
    <View style={styles.guestRow}>
      <Icon name="smartphone" />
      <View style={styles.guestText}>
        <Text style={styles.guestName}>{name}</Text>
        <Text style={styles.guestType}>
          {getDeviceTypeLabel(guest.device_type)}
        </Text>
      </View>
      <Button
        label="Remove"
        variant="ghost"
        size="card"
        onPress={() => onRemove(guest.device_id)}
      />
    </View>
  );
}

export function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const {user, logout} = useAuth();
  const {devices, removeDevice} = useDevices();
  const {errors, clearErrors} = useErrors();
  const {toast, showToast, dismissToast} = useToast();

  const {preferences, setPreference} = usePreferences();
  const [isLogoutOpen, setLogoutOpen] = useState(false);

  const guests = devices.filter(device => device.is_guest);
  const email = user?.email ?? 'Signed in';

  const onRemoveGuest = async (deviceId: string): Promise<void> => {
    await removeDevice(deviceId);
    showToast('success', 'Guest removed');
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Settings" onBack={navigation.goBack} />
      <View style={styles.body}>
        <ErrorAlert errors={errors} onDismiss={clearErrors} />
        <ScrollView>
          <SettingsSectionHeader>ACCOUNT</SettingsSectionHeader>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => navigation.navigate('Profile')}
            style={({pressed}) => [
              styles.accountRow,
              pressed ? styles.pressed : null,
            ]}>
            <Avatar name={email} size="large" />
            <View style={styles.accountText}>
              <Text style={styles.accountName}>{email}</Text>
              <Text style={styles.accountMeta}>Manage your account</Text>
            </View>
            <Icon name="chevron-right" color={colors.textDisabled} />
          </Pressable>
          <SettingsRow
            label="Change password"
            icon="lock"
            onPress={() => navigation.navigate('Profile')}
          />

          <SettingsSectionHeader>DEVICES</SettingsSectionHeader>
          <SettingsRow
            label="Manage devices"
            icon="smartphone"
            count={devices.length}
            onPress={() => navigation.navigate('Dashboard')}
          />
          <SettingsRow
            label="Manage guests"
            icon="user-plus"
            count={guests.length}
          />
          <SettingsRow label="How to register a device?" icon="help-circle" />

          <SettingsSectionHeader>GUEST MANAGEMENT</SettingsSectionHeader>
          {guests.length === 0 ? (
            <Text style={styles.emptyGuests}>
              No guest devices on this network
            </Text>
          ) : (
            guests.map(guest => (
              <GuestRow
                key={guest.device_id}
                guest={guest}
                onRemove={onRemoveGuest}
              />
            ))
          )}

          <SettingsSectionHeader>NOTIFICATIONS</SettingsSectionHeader>
          <SettingsRow
            label="Alert behavior"
            subLabel="Whether alerts sound through silent mode"
            icon="volume-2"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <SettingsRow
            label="Push notifications"
            subLabel="Receive alerts when devices are found"
            icon="bell"
            accessory={
              <Toggle
                value={preferences.notifications_enabled}
                onValueChange={value =>
                  void setPreference('notifications_enabled', value)
                }
                accessibilityLabel="Push notifications"
              />
            }
          />
          {preferences.notifications_enabled ? (
            <>
              <SettingsRow
                label="Sound"
                icon="volume-2"
                accessory={
                  <Toggle
                    value={preferences.sound_enabled}
                    onValueChange={value =>
                      void setPreference('sound_enabled', value)
                    }
                    accessibilityLabel="Alert sound"
                  />
                }
              />
              <SettingsRow
                label="Vibration"
                icon="vibrate"
                accessory={
                  <Toggle
                    value={preferences.vibration_enabled}
                    onValueChange={value =>
                      void setPreference('vibration_enabled', value)
                    }
                    accessibilityLabel="Alert vibration"
                  />
                }
              />
            </>
          ) : null}

          <SettingsSectionHeader>APP</SettingsSectionHeader>
          <SettingsRow label="Version" value={APP_VERSION} />
          <SettingsRow
            label="Check for updates"
            onPress={() => showToast('success', "You're on the latest version")}
          />

          <SettingsSectionHeader>ABOUT</SettingsSectionHeader>
          <SettingsRow label="Terms of service" onPress={() => undefined} />
          <SettingsRow
            label="Privacy policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />

          <View style={styles.logout}>
            <Button
              label="Log out"
              variant="outlineAccent"
              alignStart
              onPress={() => setLogoutOpen(true)}
            />
          </View>
        </ScrollView>
        <Toast toast={toast} onDismiss={dismissToast} />
      </View>

      <ConfirmDialog
        visible={isLogoutOpen}
        title="Log out?"
        message="You'll stop receiving device alerts on this phone."
        confirmLabel="Log out"
        onConfirm={logout}
        onCancel={() => setLogoutOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {flex: 1},
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s12,
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s12,
    backgroundColor: colors.background,
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.border,
  },
  pressed: {backgroundColor: colors.neutral100},
  accountText: {flex: 1},
  accountName: {...typography.listTitle, color: colors.textPrimary},
  accountMeta: {...typography.small, color: colors.textSecondary},
  emptyGuests: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s14,
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.border,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s12,
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s10,
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.border,
  },
  guestText: {flex: 1},
  guestName: {...typography.bodyLarge, color: colors.textPrimary},
  guestType: {...typography.caption, color: colors.textSecondary},
  logout: {
    paddingHorizontal: spacing.s16,
    paddingTop: spacing.s24,
    paddingBottom: spacing.s32,
  },
});
