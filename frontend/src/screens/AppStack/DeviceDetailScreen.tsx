/** Detail view for one device: OS version, last seen, battery, remove action. */

import React, {useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {
  AlertModal,
  Button,
  ConfirmDialog,
  ErrorAlert,
  GuestBadge,
  Icon,
  Rule,
  Screen,
  ScreenHeader,
  SectionLabel,
  StatusBadge,
} from '@components/index';
import {useAlerts} from '@hooks/useAlerts';
import {useDeviceAlertHistory} from '@hooks/useDeviceAlertHistory';
import {useDevices} from '@hooks/useDevices';
import {useErrors} from '@hooks/useErrors';
import type {AppStackParamList} from '@/navigation/AppNavigator';
import {
  borderWidth,
  colors,
  radius,
  sizes,
  spacing,
  typography,
} from '@styles/theme';
import {BATTERY_FULL} from '@utils/constants';
import type {AlertLog} from '@/types/device';
import {
  canSendAlertTo,
  formatDate,
  formatRelativeTime,
  getBatteryColor,
  getDeviceIcon,
  getDeviceTypeLabel,
} from '@utils/helpers';
import type {Device} from '@/types/device';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'DeviceDetail'>;
type Route = RouteProp<AppStackParamList, 'DeviceDetail'>;

/** Battery percentage, bar and caption. */
function BatteryBlock({device}: {device: Device}): React.JSX.Element {
  const level = device.battery_level;
  const color = getBatteryColor(level);

  return (
    <View>
      <SectionLabel>BATTERY</SectionLabel>
      <Text style={styles.batteryValue}>
        {level === null ? 'Not reported' : `${level}%`}
      </Text>
      {level === null ? null : (
        <View style={styles.batteryTrack}>
          <View
            style={[
              styles.batteryFill,
              {width: `${level}%`, backgroundColor: color},
            ]}
          />
        </View>
      )}
      <Text style={styles.caption}>
        {level === BATTERY_FULL ? 'Fully charged' : 'Last reported level'}
      </Text>
    </View>
  );
}

/** One line of alert history: when it was sent, and whether it landed. */
function AlertHistoryRow({alert}: {alert: AlertLog}): React.JSX.Element {
  const delivered = alert.status !== 'FAILED';
  return (
    <View style={styles.historyRow}>
      <Text style={styles.caption}>{formatRelativeTime(alert.created_at)}</Text>
      <Text
        style={[
          styles.historyOutcome,
          {color: delivered ? colors.textTertiary : colors.errorText},
        ]}>
        {delivered ? '✓ Delivered' : '✗ Failed'}
      </Text>
    </View>
  );
}

/** Name, platform and OS version beside the device glyph. */
function Identity({device}: {device: Device}): React.JSX.Element {
  const name = device.device_name ?? getDeviceTypeLabel(device.device_type);
  const icon = getDeviceIcon(device.device_type);

  return (
    <View style={styles.identity}>
      <View style={styles.tile}>
        <Icon
          name={icon === 'monitor' ? 'monitor' : 'smartphone'}
          size={sizes.iconXl}
        />
      </View>
      <View style={styles.identityText}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.bodyMuted}>
          {getDeviceTypeLabel(device.device_type)}
        </Text>
        <Text style={styles.caption}>
          {device.device_os_version ?? 'OS version unknown'}
        </Text>
      </View>
    </View>
  );
}

export function DeviceDetailScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const {params} = useRoute<Route>();
  const {devices, networkName, removeDevice} = useDevices();
  const {errors, clearErrors} = useErrors();
  const {isSending, sendAlert} = useAlerts();
  const {alerts, refresh: refreshHistory} = useDeviceAlertHistory(
    params.deviceId,
  );

  const [isAlertOpen, setAlertOpen] = useState(false);
  const [isRemoveOpen, setRemoveOpen] = useState(false);

  const device = devices.find(item => item.device_id === params.deviceId);

  if (device === undefined) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Device" onBack={navigation.goBack} />
        <Text style={styles.missing}>
          This device is no longer on the network.
        </Text>
      </Screen>
    );
  }

  const name = device.device_name ?? getDeviceTypeLabel(device.device_type);
  const canAlert = canSendAlertTo(device);

  const onRemove = async (): Promise<void> => {
    setRemoveOpen(false);
    await removeDevice(device.device_id);
    navigation.goBack();
  };

  const onConfirmAlert = async (): Promise<void> => {
    await sendAlert([device.device_id]);
    setAlertOpen(false);
    // The send just added a row; reload so the history reflects it without the
    // user having to leave and come back.
    await refreshHistory();
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title={name} onBack={navigation.goBack} />
      <View style={styles.body}>
        <ErrorAlert errors={errors} onDismiss={clearErrors} />
        <ScrollView contentContainerStyle={styles.content}>
          <Identity device={device} />

          <Rule />

          <View>
            <SectionLabel>STATUS</SectionLabel>
            <View style={styles.badges}>
              <StatusBadge status={device.status} />
              <GuestBadge isGuest={device.is_guest} />
            </View>
            {device.is_guest ? (
              <Text style={styles.guestNote}>
                Guest device — it receives alerts but cannot send them.
              </Text>
            ) : null}
            <Text style={styles.bodyMuted}>
              {`Connected at: ${networkName ?? 'Unknown network'}`}
            </Text>
            <Text style={styles.bodyMuted}>
              {`Last seen: ${formatRelativeTime(device.last_heartbeat)}`}
            </Text>
          </View>

          <Rule />
          <BatteryBlock device={device} />
          <Rule />

          <View style={styles.meta}>
            <Text style={styles.caption}>
              {`Registered: ${formatDate(device.created_at)}`}
            </Text>
            <Text style={styles.caption}>
              {`Device ID: ${device.device_id}`}
            </Text>
          </View>

          <Rule />

          <View>
            <Text style={styles.sectionTitle}>Alert history</Text>
            {alerts.length === 0 ? (
              <Text style={styles.bodyMuted}>No alerts sent yet</Text>
            ) : (
              alerts.map(alert => (
                <AlertHistoryRow key={alert.alert_id} alert={alert} />
              ))
            )}
          </View>

          {device.is_guest ? null : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setRemoveOpen(true)}
              style={styles.remove}>
              <Text style={styles.removeLabel}>Remove device</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        {device.is_guest ? (
          <Button
            label="Remove guest"
            variant="outlineAccent"
            size="dialog"
            onPress={() => setRemoveOpen(true)}
            style={styles.footerSecondary}
          />
        ) : null}
        <Button
          label={canAlert ? 'Send alert' : 'Device is not reachable'}
          disabled={!canAlert}
          onPress={() => setAlertOpen(true)}
        />
      </View>

      <AlertModal
        device={device}
        visible={isAlertOpen}
        isSending={isSending}
        networkName={networkName ?? undefined}
        onConfirm={onConfirmAlert}
        onCancel={() => setAlertOpen(false)}
      />
      <ConfirmDialog
        visible={isRemoveOpen}
        title={device.is_guest ? 'Remove guest?' : 'Remove device?'}
        message={
          device.is_guest
            ? 'This guest will no longer receive alerts.'
            : 'This device will no longer appear on your network.'
        }
        confirmLabel="Remove"
        onConfirm={onRemove}
        onCancel={() => setRemoveOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {flex: 1},
  content: {padding: spacing.s16, gap: spacing.s16},
  missing: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.s16,
  },
  identity: {flexDirection: 'row', alignItems: 'center', gap: spacing.s16},
  tile: {
    width: sizes.deviceTile,
    height: sizes.deviceTile,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral200,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: radius.none,
  },
  identityText: {flex: 1},
  name: {...typography.dialogTitle, color: colors.textPrimary},
  bodyMuted: {...typography.body, color: colors.textSecondary},
  caption: {...typography.caption, color: colors.textSecondary},
  badges: {flexDirection: 'row', alignItems: 'center', gap: spacing.s6},
  guestNote: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.s6,
    marginBottom: spacing.s6,
  },
  batteryValue: {...typography.cardTitle, color: colors.textPrimary},
  batteryTrack: {
    height: sizes.batteryBar,
    backgroundColor: colors.batteryTrack,
    marginTop: spacing.s8,
  },
  batteryFill: {height: sizes.batteryBar},
  meta: {gap: spacing.s2},
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s10,
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.border,
  },
  historyOutcome: {...typography.smallStrong},
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.s8,
  },
  remove: {alignSelf: 'center', padding: spacing.s12, marginTop: spacing.s16},
  removeLabel: {...typography.bodyStrong, color: colors.primaryDarker},
  footer: {
    paddingHorizontal: spacing.s16,
    paddingTop: spacing.s12,
    paddingBottom: spacing.s16,
    borderTopWidth: borderWidth.rule,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  footerSecondary: {marginBottom: spacing.s8},
});
