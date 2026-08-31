/**
 * Dashboard -- the main screen.
 *
 * Lists every device on the current WiFi with live status and battery, and
 * sends alerts. This is where the app spends almost all of its time.
 */

import React, {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AlertModal,
  Avatar,
  DeviceCard,
  EmptyState,
  ErrorAlert,
  Icon,
  Screen,
  ScreenHeader,
  SkeletonCard,
  Toast,
} from '@components/index';
import {useAlerts} from '@hooks/useAlerts';
import {useAuth} from '@hooks/useAuth';
import {useDevices} from '@hooks/useDevices';
import {useErrors} from '@hooks/useErrors';
import {useToast} from '@hooks/useToast';
import type {AppStackParamList} from '@/navigation/AppNavigator';
import {colors, sizes, spacing, typography} from '@styles/theme';
import type {Device} from '@/types/device';

const SKELETON_KEYS = ['a', 'b', 'c'] as const;

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Dashboard'>;

/** Network name and the online count, in the header's leading slot. */
function NetworkSummary({
  networkName,
  online,
  total,
}: {
  networkName: string | null;
  online: number;
  total: number;
}): React.JSX.Element {
  return (
    <View style={styles.summary}>
      <Icon name="wifi" size={sizes.iconSm} color={colors.primary} />
      <View>
        <Text style={styles.networkName}>
          {networkName ?? 'Finding network…'}
        </Text>
        <Text style={styles.deviceCount}>
          {`${online} of ${total} devices online`}
        </Text>
      </View>
    </View>
  );
}

export function DashboardScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const {user} = useAuth();
  const {devices, networkName, isLoading, isRefreshing, refresh} = useDevices();
  const {errors, clearErrors} = useErrors();
  const {isSending, sendAlert} = useAlerts();
  const {toast, showToast, dismissToast} = useToast();

  const [target, setTarget] = useState<Device | null>(null);

  const onlineCount = devices.filter(
    device => device.status === 'ONLINE',
  ).length;

  const onSendAlert = (deviceId: string): void => {
    const device = devices.find(item => item.device_id === deviceId);
    if (device === undefined) {
      return;
    }
    setTarget(device);
  };

  const onConfirmAlert = async (): Promise<void> => {
    if (target === null) {
      return;
    }
    const sent = await sendAlert([target.device_id]);
    setTarget(null);
    showToast(
      sent ? 'success' : 'error',
      sent ? 'Device alert sent!' : 'Failed to send alert',
    );
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        leading={
          <NetworkSummary
            networkName={networkName}
            online={onlineCount}
            total={devices.length}
          />
        }
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => navigation.navigate('Settings')}>
            <Avatar name={user?.email ?? 'Account'} />
          </Pressable>
        }
      />
      <View style={styles.body}>
        <ErrorAlert errors={errors} onDismiss={clearErrors} />
        {isLoading ? (
          <View style={styles.list}>
            {SKELETON_KEYS.map(key => (
              <SkeletonCard key={key} />
            ))}
          </View>
        ) : (
          <FlatList
            data={devices}
            keyExtractor={device => device.device_id}
            contentContainerStyle={
              devices.length === 0 ? styles.emptyList : styles.list
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="smartphone"
                title="No devices found"
                message="Make sure your devices are connected to the same WiFi network."
                actionLabel="Refresh"
                onAction={refresh}
              />
            }
            renderItem={({item}) => (
              <DeviceCard
                device={item}
                onPress={deviceId =>
                  navigation.navigate('DeviceDetail', {deviceId})
                }
                onSendAlert={onSendAlert}
              />
            )}
          />
        )}
        <Toast toast={toast} onDismiss={dismissToast} />
      </View>
      <AlertModal
        device={target}
        visible={target !== null}
        isSending={isSending}
        networkName={networkName ?? undefined}
        onConfirm={onConfirmAlert}
        onCancel={() => setTarget(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {flexDirection: 'row', alignItems: 'center', gap: spacing.s8},
  networkName: {...typography.smallStrong, color: colors.textPrimary},
  deviceCount: {...typography.micro, color: colors.textSecondary},
  body: {flex: 1},
  list: {padding: spacing.s16, gap: spacing.s12},
  emptyList: {flexGrow: 1},
});
